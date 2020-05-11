import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ServicesService } from '../services.service';
import { filListeAnim, feilMelding } from 'src/animasjon';

interface FilSomSkalBliMinifisert {
  indeks: number;
  data: File;
  status: 'Ready to be minified...' | 'OK!' | 'Fail!';
  visPath: boolean;
  melding?: string;
}

@Component({
  selector: 'app-fil-leser',
  templateUrl: './fil-leser.component.html',
  styleUrls: ['./fil-leser.component.scss'],
  animations: [
    filListeAnim,
    feilMelding
  ]
})
export class FilLeserComponent implements OnInit {
  private IPCRenderer: IpcRenderer | undefined;

  @ViewChild('luaFiler', { static: true }) luaFiler: ElementRef<HTMLInputElement>;
  @ViewChild('luaFolder', { static: true }) luaFolder: ElementRef<HTMLInputElement>;
  @ViewChild('antalFiler', { static: true }) antalFiler: ElementRef<HTMLInputElement>;
  @ViewChild('outputFolder', { static: true }) outputFolder: ElementRef<HTMLInputElement>;
  @ViewChild('fileComment', { static: true }) fileComment: ElementRef<HTMLInputElement>;

  totaleMengderFiler: File[] = [];
  totaleMengderFilerVisuellStatus: FilSomSkalBliMinifisert[] = [];
  utDataMappe = '';
  feilMelding = null;
  noverandOperasjonProsentFerdig = null;
  noverandOperasjonHeiltFerdig = true;
  filtererFiler = false;
  luaFilerValt: FileList;
  visProgresjonFiler = false;

  constructor(private service: ServicesService) {
    if (window.require) {
      try {
        this.IPCRenderer = window.require('electron').ipcRenderer;
      } catch (e) { throw e; }
    } else { console.warn(`Electron's IPCRenderer was not loaded!`); }
  }

  ngOnInit() {
  }

  settInnFilIVisuellArray(
    indeks: FilSomSkalBliMinifisert['indeks'],
    data: FilSomSkalBliMinifisert['data'],
    status: FilSomSkalBliMinifisert['status'],
    visPath: FilSomSkalBliMinifisert['visPath'],
    melding?: FilSomSkalBliMinifisert['melding']
  ) {
    this.totaleMengderFilerVisuellStatus.push({ indeks, data, status, visPath, melding });
  }
  oppdaterFilIVisuellArray(
    indeks: FilSomSkalBliMinifisert['indeks'],
    data: FilSomSkalBliMinifisert['data'],
    status: FilSomSkalBliMinifisert['status'],
    visPath: FilSomSkalBliMinifisert['visPath'],
    melding?: FilSomSkalBliMinifisert['melding']
  ) {
    this.totaleMengderFilerVisuellStatus.splice(indeks, 1, { indeks, data, status, visPath, melding });
  }
  slettFilIFerdigeArrayer(indeks: number) {
    this.totaleMengderFiler.splice(indeks, 1);
    this.totaleMengderFilerVisuellStatus = [];

    // Sett inn for det visuelle
    this.filtererFiler = true;
    const iMax = this.totaleMengderFiler.length;
    let i = 0;
    for (const fil of this.totaleMengderFiler) {
      i++;
      this.settInnFilIVisuellArray(i - 1, fil, 'Ready to be minified...', false);

      if (i === iMax) { setTimeout(() => { this.filtererFiler = false; }, 300); }
    }
  }
  async filtrerGodtaBerreLua(filListe: File[]): Promise<File[]> { // Sorterer også alfabetisk ..
    this.filtererFiler = true;
    const nyTotaleMengderFiler: File[] = [];
    await new Promise(async res => {
      const iMax = filListe.length;
      let i = 0;
      for (const fil of filListe) {
        i++;
        // Er ein .lua-fil
        if (fil.name.match(/([^\\^//]{1,}(\.lua))/gm)) { nyTotaleMengderFiler.push(fil); }

        // Ferdig med å filtrere... Oppdater det visuelle
        if (i === iMax) {
          // Sorter
          nyTotaleMengderFiler.sort((a, b) => a.name.localeCompare(b.name));
          await new Promise(res0 => { setTimeout(() => { res0(); }, 2000); });

          // Sett inn for det visuelle
          const iMax0 = nyTotaleMengderFiler.length;
          let i0 = 0;
          for (const filNy of nyTotaleMengderFiler) {
            i0++;
            this.settInnFilIVisuellArray(i0 - 1, filNy, 'Ready to be minified...', false);

            if (i0 === iMax0) { setTimeout(() => { res(); this.filtererFiler = false; }, 2000); }
          }
        }
      }
    });

    return nyTotaleMengderFiler;
  }
  async minifiserFiler(filListe: File[]): Promise<boolean> {
    this.klarerAltVisuelt();
    this.noverandOperasjonHeiltFerdig = false;

    // Kanskje legg til slash på
    let splitter = '/';
    if (!this.outputFolder.nativeElement.value.match(splitter)) { splitter = '\\'; }
    if (this.outputFolder.nativeElement.value.slice((this.outputFolder.nativeElement.value.length - 1)) !== splitter) {
      const nyUtDataMappe = `${this.outputFolder.nativeElement.value}${splitter}`;

      this.outputFolder.nativeElement.value = nyUtDataMappe;
      this.utDataMappe = nyUtDataMappe;
    }
    await new Promise(async res => { setTimeout(() => { res(); }, 300); });

    // Send til backend for behandling...
    const status: boolean = await new Promise((res, rej): Promise<boolean> => {
      if (!filListe) { res(false); return; }

      // Async replay
      const asyncReplay = (event, arg: string) => {
        if (arg.match(/progresjon/gm)) {
          const data = arg.split('-')[1].split('$$$');
          const indeks = Number(data[0]);
          const prosent = Number(data[1]);

          // Vis progresjon... Denne oppdaters når ein fil er ferdig behandlet
          this.visProgresjonFiler = true;
          const progresjonProsent = (prosent * 100).toFixed(2);

          this.noverandOperasjonProsentFerdig = progresjonProsent;
          console.log('Prosent ferdig:', progresjonProsent);

          // Oppdater visuell array...
          this.oppdaterFilIVisuellArray(
            indeks,
            (this.totaleMengderFilerVisuellStatus[indeks] ? this.totaleMengderFilerVisuellStatus[indeks].data : null),
            'OK!',
            (this.totaleMengderFilerVisuellStatus[indeks] ? this.totaleMengderFilerVisuellStatus[indeks].visPath : false)
          );
        } else if (arg.match(/error/gm)) {
          const data = arg.split('-')[1].split('$$$');
          const indeks = Number(data[0]);
          const errorMelding = data[1];

          console.error('Error!', errorMelding);

          // Oppdater visuell array...
          this.oppdaterFilIVisuellArray(
            indeks,
            (this.totaleMengderFilerVisuellStatus[indeks] ? this.totaleMengderFilerVisuellStatus[indeks].data : null),
            'Fail!',
            (this.totaleMengderFilerVisuellStatus[indeks] ? this.totaleMengderFilerVisuellStatus[indeks].visPath : false),
            errorMelding
          );

          res(false);
          this.IPCRenderer.removeListener('asynchronous-reply', asyncReplay);
        }

        // 100 % Ferdig OK
        if (arg === 'ferdig') {
          res(true);
          this.IPCRenderer.removeListener('asynchronous-reply', asyncReplay);
        }
      };
      this.IPCRenderer.on('asynchronous-reply', asyncReplay);

      // Send inn fil-sti ( sidan heile er vist her, går det bra...
      // Ikkje noko sikkerheit ? Er det til vanlig (ikkje electron-app trur eg..) )
      const ekstraKommentarPaaAlleFiler = this.fileComment.nativeElement.value;
      const iMax = filListe.length;
      const sendTilMinifisering = (indeks: number) => {
        const fil = filListe[indeks];

        this.IPCRenderer.send(
          'asynchronous-message',
          [
            indeks,
            iMax,
            fil.path,
            this.utDataMappe,
            fil.name,
            (ekstraKommentarPaaAlleFiler.length > 0 ? ekstraKommentarPaaAlleFiler : null)
          ].join('$$$')
        );

        if (indeks < (iMax - 1)) {
          const nyIndex = indeks + 1;
          setTimeout(() => { sendTilMinifisering(nyIndex); }, 50);
        }
      };
      sendTilMinifisering(0);
    });

    this.noverandOperasjonProsentFerdig = null;
    this.noverandOperasjonHeiltFerdig = status;
    console.log('100% Complete. Finished with status:', status);

    return status;
  }
  async filerValt(filer: FileList) {
    this.feilMelding = null;
    this.klarerAlleFiler();
    this.klarerAltVisuelt();

    // Legg til filer for bruk seinere
    this.luaFilerValt = filer;
    for (let i = 0; i < filer.length; i++) { this.totaleMengderFiler.push(filer[i]); }

    if (
      !this.totaleMengderFiler
      || this.totaleMengderFiler.length <= 0) {
      this.feilMelding = `
      (0) Try again. Something went wrong... Could not get any files you picked... Ref.:
      ${JSON.stringify(this.totaleMengderFiler, null, 2)}`;
      console.error(this.feilMelding); return;
    }

    if (this.outputFolder.nativeElement.value.length <= 0) {
      this.outputFolder.nativeElement.disabled = true;
      this.outputFolder.nativeElement.value = 'Loading...';
    }

    // Filtrer ut alle unødvendige filer ( ikkje .lua )
    this.totaleMengderFiler = await this.filtrerGodtaBerreLua(this.totaleMengderFiler);

    if (
      !this.totaleMengderFiler[0]
      || !this.totaleMengderFiler[0].path) {
      this.feilMelding = `
      (1) Try again. Something went wrong... It seems like the path is private. Are you using this in a normal browser? Ref.:
      ${JSON.stringify(this.totaleMengderFiler, null, 2)}`;
      console.error(this.feilMelding); return;
    }

    if (this.outputFolder.nativeElement.value.length <= 0 || this.outputFolder.nativeElement.value === 'Loading...') {
      // Sett ut-data-mappe som referanse til fyrste fil i array..
      let folderLocation = this.totaleMengderFiler[0].path.replace(/([^\\^//]{1,}(\.lua))/m, '');
      // Gå ein mappe tilbake...
      let splitter = '/';
      if (!folderLocation.match(splitter)) { splitter = '\\'; }
      const nyMappe = folderLocation.split(splitter);
      // Slett dei siste, får å gå ein mappe tilbake
      nyMappe.pop();
      const sisteMappe = nyMappe[nyMappe.length - 1];
      nyMappe.pop();

      folderLocation = nyMappe.join(splitter);

      const nyUtDataMappe = `${folderLocation}${splitter}${sisteMappe}-minified${splitter}`;

      this.outputFolder.nativeElement.value = nyUtDataMappe;
      this.utDataMappe = nyUtDataMappe;
    } else { this.utDataMappe = this.outputFolder.nativeElement.value; }

    this.outputFolder.nativeElement.disabled = false;
  }

  klarerAlleFiler() {
    this.totaleMengderFiler = [];
    this.totaleMengderFilerVisuellStatus = [];
  }
  klarerAltVisuelt() {
    this.noverandOperasjonHeiltFerdig = true;
    this.visProgresjonFiler = false;
    this.noverandOperasjonProsentFerdig = null;
  }
  klarerAlt() {
    this.klarerAlleFiler();
    this.klarerAltVisuelt();

    this.luaFilerValt = undefined;
  }

  settUtDataMappeFraaVelger(filer: FileList) {
    if (filer.length > 0 && filer[0].path) {
      let splitter = '\\'; if (filer[0].path.match('/')) { splitter = '/'; }
      let folder: string | string[] = filer[0].path.split(splitter); folder.pop(); folder = folder.join('\\');
      this.outputFolder.nativeElement.value = `${folder}${splitter}`;
    }
  }

}
