import { Component, signal } from '@angular/core';
import {Sidebar} from '../sidebar/sidebar';
import {Header} from '../header/header';
import {MapaComponent} from '../../features/mapa/mapa';

@Component({
  selector: 'app-main-layout',
  imports: [Sidebar, Header, MapaComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {
  protected readonly title = signal('SmartTransit');
}
