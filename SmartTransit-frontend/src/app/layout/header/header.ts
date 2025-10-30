import { Component, inject } from '@angular/core';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // Inyectamos el servicio para poder usar su método toggle
  public layoutService = inject(LayoutService);
}
