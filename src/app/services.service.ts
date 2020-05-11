import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ServicesService {

  constructor() { }

  lerp(fraa, til, tid) {
    return (1 - tid) * fraa + tid * til;
  }
}
