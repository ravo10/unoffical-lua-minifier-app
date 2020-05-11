const { ipcMain } = require('electron')
const luamin = require('luamin'); /* https://github.com/mathiasbynens/luamin */
const fs = require('fs');
const path = require('path');

/* Eksempel:
var luaCode = 'a = ((1 + 2) - 3) * (4 / (5 ^ 6)) -- foo';
luamin.minify(luaCode); // 'a=(1+2-3)*4/5^6'

// `minify` also accepts luaparse-compatible ASTs as its argument:
var ast = luaparse.parse(luaCode, { 'scope': true });
luamin.minify(ast); // 'a=(1+2-3)*4/5^6'
*/
/**
 * Minifiser!
 * 
 * Tar inn fil-data (array):
 * 0: Index
 * 1: IndexMax
 * 2: Fil-sti
 * 3: Fil-utdata-mappe
**/
async function minifiserFilFraaFilData(event, filData) {
    const index = Number(filData[0]);
    const indexMax = Number(filData[1]);
    const filSti = filData[2];
    const filUtDataMappe = filData[3];
    const filNamn = filData[4];
    const ekstraKommentar = filData[5]; // Alternativt

    const sendUtEinError = function (id, index, errorMelding) {
        console.log('Send ut ein error:', id);

        event.reply('asynchronous-reply', `error-${index ? index : -1}$$$${errorMelding}`);
        console.error(errorMelding)
    }

    if (!index && typeof (index) !== 'number') { sendUtEinError('1', null, 'Type Error: Index can not be nil...'); return; }
    if (!indexMax && typeof (index) !== 'number') { sendUtEinError('2', index, 'Type Error: IndexMax can not be nil...'); return; }
    if (!filSti || typeof (filSti) !== 'string' || filSti === '') { sendUtEinError('3', index, 'Type Error: File Path can not be nil or blank...'); return; }
    if (!filUtDataMappe || typeof (filUtDataMappe) !== 'string' || filUtDataMappe === '') { sendUtEinError('4', index, 'Folder Output Path can not be nil or blank...'); return; }
    if (!filNamn || typeof (filNamn) !== 'string' || filNamn === '') { sendUtEinError('5', index, 'Type Error: Folder Name can not be nil or blank...'); return; }

    // Sjekk om nokon mapper må lages...
    let errorForMappeLaging = false;
    fs.access(path.parse(filUtDataMappe).dir, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        if (err) {
            sendUtEinError('6', index, `Write Access Output Dir.: ${err.message ? err.message : '!message'}`);
            errorForMappeLaging = true;
        }

        // Sjekk om mappa eksisterer allereie
        const parsedPath = path.parse(filUtDataMappe)

        const mappeEksisterer = fs.existsSync(path.join(parsedPath.dir, parsedPath.base));
        if (!mappeEksisterer) {
            // Lag mappe
            fs.mkdir(path.join(parsedPath.dir, parsedPath.base), function (err0) {
                if (err0) {
                    sendUtEinError('7', index, `New Output Dir.: ${err0.message ? err0.message : '!message'}`)
                    errorForMappeLaging = true;
                }
            });
        }
    }); if (errorForMappeLaging) { return; }

    // Sjekk att tilgang til fil...
    const filStiNy = path.parse(filSti);
    fs.access(path.join(filStiNy.dir, filStiNy.base), fs.constants.R_OK, (err) => {
        if (err) { sendUtEinError('8', index, `Read Old File Access: ${err.message ? err.message : '!message'}`); } else {
            // OK => Prøv å les av fil
            fs.readFile(path.join(path.parse(filSti).dir, path.parse(filSti).base), 'utf-8', async (err, data) => {
                if (err) { sendUtEinError('9', index, `File Read: ${err.message ? err.message : '!message'}`); return; }

                // Behandle data ( minifiser )
                let gamalLuaData = data;
                // Erstatt Teikn i LUA som er godtatt i GLUA til vanlig LUA..
                gamalLuaData = gamalLuaData.replace(/[!]/gm, ' not '); // Alle "!" med " not "
                await new Promise(async res => { setTimeout(() => { res(); }, 300); });
                gamalLuaData = gamalLuaData.replace(/(\snot\s[=]){1,1}/gm, '!='); // **Sett inn igjen " not =" => "!="
                await new Promise(async res => { setTimeout(() => { res(); }, 300); });
                gamalLuaData = gamalLuaData.replace(/([!][=]){1,1}/gm, '~='); // Alle "!=" med "~="
                await new Promise(async res => { setTimeout(() => { res(); }, 300); });
                gamalLuaData = gamalLuaData.replace(/([&][&]){1,1}/gm, ' and '); // Alle "&&" med " and "
                await new Promise(async res => { setTimeout(() => { res(); }, 300); });
                gamalLuaData = gamalLuaData.replace(/([|][|]){1,1}/gm, ' or '); // Alle "||" med " or "
                await new Promise(async res => { setTimeout(() => { res(); }, 300); });

                // Prøv og MINIFISER
                let nyLuaData; try { nyLuaData = luamin.minify(gamalLuaData); }
                catch (err) { sendUtEinError('10', index, `Minifiy File: ${err.message ? err.message : '!message'} File Data: ${gamalLuaData}`); return; }

                // Vent på att lua-data er lasta inn...
                await new Promise(async res => {
                    const laster = function () {
                        if (!nyLuaData) { setTimeout(() => { laster(); }, 100); } else { res(); }
                    }; laster();
                });

                // Sett inn evt. kommentar på start
                if (ekstraKommentar) {
                    nyLuaData = `--[[ ${ekstraKommentar} ]]${nyLuaData}`;
                    await new Promise(async res => { setTimeout(() => { res(); }, 300); });
                }

                // Skriv data til den nye mappa...
                const filUtDataMappeFormater = path.parse(filUtDataMappe);
                fs.writeFile(path.join(filUtDataMappeFormater.dir, filUtDataMappeFormater.base, filNamn), nyLuaData, 'utf8', (err) => {
                    if (err) { sendUtEinError('11', index, `New Minified File Write: ${err.message ? err.message : '!message'}`); return; }
                    // ** ALT OK!! **
                    //
                    // Send ut kor mange filer som er behandlet
                    event.reply('asynchronous-reply', `progresjon-${index}$$$${(index + 1) / indexMax}`);

                    // Fin effekt når ferdig
                    setTimeout(() => { if (index + 1 === indexMax) { event.reply('asynchronous-reply', 'ferdig'); } }, 1000);
                });
            });
        }
    });
}

// LUA MINIFIER
ipcMain.on('asynchronous-message', async (event, arg) => {
    const filData = arg.split('$$$');

    minifiserFilFraaFilData(event, filData)
})
