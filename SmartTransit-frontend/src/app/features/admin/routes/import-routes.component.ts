import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface UploadedRoute {
  name: string;
  color: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  preview?: { points: number; distance?: string };
  errorMessage?: string;
}

@Component({
  selector: 'app-import-routes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-routes.component.html',
  styleUrl: './import-routes.component.scss'
})
export class ImportRoutesComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly routes = signal<UploadedRoute[]>([]);
  readonly isDragging = signal(false);
  readonly isUploading = signal(false);

  readonly predefinedColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788', '#E63946', '#457B9D'
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    const gpxFiles = files.filter(f => f.name.toLowerCase().endsWith('.gpx'));
    
    if (gpxFiles.length === 0) {
      alert('Por favor selecciona archivos GPX válidos');
      return;
    }

    gpxFiles.forEach((file, index) => {
      const route: UploadedRoute = {
        name: file.name.replace('.gpx', ''),
        color: this.predefinedColors[this.routes().length % this.predefinedColors.length],
        file,
        status: 'pending'
      };

      this.routes.update(routes => [...routes, route]);
      this.parseGPXPreview(file, this.routes().length - 1);
    });
  }

  private parseGPXPreview(file: File, index: number): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'text/xml');
      
      const trackPoints = xml.querySelectorAll('trkpt');
      const routePoints = xml.querySelectorAll('rtept');
      const points = Math.max(trackPoints.length, routePoints.length);
      
      this.routes.update(routes => {
        routes[index].preview = { 
          points,
          distance: points > 0 ? `~${(points * 0.01).toFixed(1)} km` : 'N/A'
        };
        return [...routes];
      });
    };

    reader.readAsText(file);
  }

  updateRouteName(index: number, name: string): void {
    this.routes.update(routes => {
      routes[index].name = name;
      return [...routes];
    });
  }

  updateRouteColor(index: number, color: string): void {
    this.routes.update(routes => {
      routes[index].color = color;
      return [...routes];
    });
  }

  removeRoute(index: number): void {
    this.routes.update(routes => routes.filter((_, i) => i !== index));
  }

  async uploadRoutes(): Promise<void> {
    const pendingRoutes = this.routes().filter(r => r.status === 'pending');
    
    if (pendingRoutes.length === 0) {
      alert('No hay rutas pendientes para subir');
      return;
    }

    this.isUploading.set(true);

    for (let i = 0; i < this.routes().length; i++) {
      const route = this.routes()[i];
      
      if (route.status !== 'pending') continue;

      // Actualizar estado a uploading
      this.routes.update(routes => {
        routes[i].status = 'uploading';
        return [...routes];
      });

      try {
        const formData = new FormData();
        formData.append('file', route.file);
        formData.append('name', route.name);
        formData.append('color', route.color);

        // Llamar al backend
        await this.http.post('http://localhost:8080/api/admin/routes/upload', formData)
          .toPromise();

        // Marcar como exitoso
        this.routes.update(routes => {
          routes[i].status = 'success';
          return [...routes];
        });

      } catch (error: any) {
        console.error('Error uploading route:', error);
        this.routes.update(routes => {
          routes[i].status = 'error';
          routes[i].errorMessage = error?.message || 'Error desconocido';
          return [...routes];
        });
      }

      // Pequeña pausa entre uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isUploading.set(false);

    // Verificar si todos fueron exitosos
    const allSuccess = this.routes().every(r => r.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        alert('¡Todas las rutas se importaron correctamente!');
        this.router.navigate(['/admin/routes']);
      }, 1000);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}

