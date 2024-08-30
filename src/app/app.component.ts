import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FlightsComponent } from './core/components/flights/flights.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FlightsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'cosmos_odyssey';
}
