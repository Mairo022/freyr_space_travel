import { Component, inject } from '@angular/core';
import { RoutesService } from '../../services/routes.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Fetch } from '../../services/fetch';
import { CommonModule } from '@angular/common';
import { RouteOffersSort, RouteOffersSortProperty, RouteProvider, RoutesRendered } from './flights.model'
import { v4 as uuidv4 } from 'uuid';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompanyLogoComponent } from '../company-logo/company-logo.component';
import { AppState } from '../../store/app.state';
import { LocalStorage } from '../../utils/localStorage';

@Component({
  selector: 'app-flights',
  standalone: true,
  imports: [CompanyLogoComponent, ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './flights.component.html',
  styleUrl: './flights.component.scss'
})
export class FlightsComponent {
  private readonly appState = AppState.getInstance()
  private readonly routesService = inject(RoutesService)
  planets = new Fetch<string[]>(this.routesService.getPlanets())
  companies = new Fetch<string[]>(this.routesService.getCompanies())
  routes = new Fetch<Array<RouteProvider[]>>
  routesOffers = new Array<RoutesRendered> 
  routesData = new Array<RouteProvider[]>

  isBookingDialogueOpen: boolean = false;
  bookingDialogueData: RoutesRendered | undefined = undefined

  private readonly defaultRouteOffersSort: RouteOffersSort = {
    property: "startDT",
    direction: "asc"
  }
  private routesOffersSort = {...this.defaultRouteOffersSort}

  routeForm: FormGroup

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.routeForm = this.fb.group({
      from: null,
      to: null
    })
  }

  getRouteInfo(index: number, pathIndex: number): RouteProvider | undefined {
    if (this.routesData == null) return undefined
    const route = this.routesData[index][pathIndex]

    return route
  }

  getRouteTime(index: number, pathIndex: number, type: "start" | "end") {
    if (this.routesData == null) return ""

    const route = this.routesData[index][pathIndex]
    const startTime = route.flightStart
    const endTime = route.flightEnd

    if (type === "start") return startTime
    return endTime
  }

  getRoutePlanet(index: number, pathIndex: number, type: "start" | "end"): string {
    if (this.routesData == null) return ""

    const route = this.routesData[index][pathIndex]
    const from = route.from
    const to = route.to

    if (type === "start") return from
    return to
  }

  ngOnInit() {
    this.initLoadByQueryParams()

    this.routes.data$.subscribe(routeProvidersList => {
      const from = this.routeForm.value.from
      const to = this.routeForm.value.to

      this.routesOffers = this.getRenderableOffers(routeProvidersList, from, to)
      this.routesData = routeProvidersList
    })
  }

  ngOnDestroy() {
    this.routes.data$.unsubscribe()
  }

  initLoadByQueryParams() {
    this.route.queryParams.subscribe(params => {
      const from: string | undefined = params['from']
      const to: string | undefined = params['to']

      if (!from || !to) return
      if (this.routeForm.value.from !== from) this.routeForm.patchValue({ from })
      if (this.routeForm.value.to !== to) this.routeForm.patchValue({ to })

      this.routes.load(this.routesService.getRoutes(from, to))
    })
  }

  onSubmit(): void {
    const from = this.routeForm.value.from
    const to = this.routeForm.value.to

    if (!from || !to) {
      return
    }

    this.router.navigate(['.'], {
      queryParams: {from, to}
    })
  }

  getRenderableOffers(routes: Array<RouteProvider[]>, from: string, to: string): RoutesRendered[] {
    const offers = new Array<RoutesRendered>

    routes.forEach((paths, i) => {
      const arrayIndex = i
      const uuid = uuidv4()
      const company = paths[0].company.name
      const stops = paths.length - 1
      const stopsStr = this.formatStops(stops)
      const startDT = new Date(paths[0].flightStart)
      const endDT = new Date(paths[paths.length - 1].flightEnd)
      const timeStr = this.formatDatetime(startDT) + " - " + this.formatDatetime(endDT)
      const duration = (endDT.getTime() - startDT.getTime()) / (1000 * 60)
      const durationStr = this.formatTime(duration)
      const offerIDs = paths.map(path => path.id)
      const visible = true 
      let price = paths.reduce((total, offer) => total + offer.price * 1000, 0) / 1000
      const open = false;
      
      offers.push({
        arrayIndex, uuid, offerIDs, 
        company, from, to, price,
        stops, stopsStr, 
        startDT, endDT, timeStr,
        duration, durationStr,
        open, visible
      })
    })

    const sortedOffers = this.getSortedRouteOffers(offers, this.defaultRouteOffersSort)
    
    return sortedOffers
  }

  getSortedRouteOffers(offers: RoutesRendered[], sort: RouteOffersSort): Array<RoutesRendered> {
    const offersCopy = offers.slice()
    const property = sort.property
    const direction = sort.direction

    this.routesOffersSort.property = property
    this.routesOffersSort.direction = direction

    if (direction == "asc") offersCopy.sort((a,b) => (a[property] as number) - (b[property] as number))
    if (direction == "desc") offersCopy.sort((a,b) => (b[property] as number) - (a[property] as number))
    
    return offersCopy
  }

  sortRouteOffers(property: RouteOffersSortProperty): void {
    const sort: RouteOffersSort = {
      property: property,
      direction: "asc"
    }
    
    if (this.routesOffersSort.property == property) {
      sort.direction = this.routesOffersSort.direction == "asc" ? "desc" : "asc"
    } else {
      sort.direction = "desc"
    }

    this.routesOffers = this.getSortedRouteOffers(this.routesOffers, sort)
  }

  filterRouteOffersByCompany(company: string): void {
    this.routesOffers.forEach(offer => {
      if (company === "all")
        offer.visible = true
      else if (offer.company !== company)
        offer.visible = false
    })
  }

  getTimegap(start: string, end: string): string {
    const startDT = new Date(start)
    const endDT = new Date(end)

    const gapInMin = (endDT.getTime() - startDT.getTime()) / (1000 * 60)
    const gap = this.formatTime(gapInMin)

    return gap
  }
  
  formatTime(timeMinutes: number): string {
    const weekInMin = 10080
    const dayInMin = 1440
    const hourInMin = 60

    const timeWeeks = timeMinutes >= weekInMin ? Math.floor(timeMinutes / weekInMin) : 0
    const timeDays = timeMinutes >= dayInMin ? Math.floor(timeMinutes / dayInMin) : 0
    const timeHours = timeMinutes >= hourInMin ? Math.floor(timeMinutes / hourInMin) : 0

    if (timeWeeks > 0) {
      const daysLeft = timeDays - timeWeeks * 7
      if (daysLeft === 0) return `${timeWeeks}w`
      return `${timeWeeks}w ${daysLeft}d`
    }
    if (timeDays > 0) {
      const hoursLeft = timeHours - timeDays * 24
      if (hoursLeft === 0) return `${timeDays}d`
      return `${timeDays}d ${hoursLeft}h`
    }
    if (timeHours > 0) {
      const minsLeft = timeMinutes - timeHours * 60
      if (minsLeft === 0) return `${timeHours}h`
      return `${timeHours}h ${minsLeft}m`
    }

    return `${timeMinutes.toFixed(0)}m`
  }

  formatDatetime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return date.toLocaleString('en-US', options);
  }

  formatStops(stops: number): string {
    if (stops > 1) return `${stops} stops`
    if (stops === 1) return `${stops} stop`
    return `No stops`
  }

  formatTimeHHMM(time: string) {
    const date = new Date(time);
    return date.toLocaleTimeString(navigator.language, {
      hour: '2-digit',
      minute:'2-digit'
    });
  }

  isActivePath(planet: string, source: "from" | "to"): boolean {
    if (source === "to") return this.routeForm.value.to === planet
    if (source === "from") return this.routeForm.value.from === planet
    return false
  }

  isSelectedPlanet(planet: string, source: "from" | "to"): boolean {
    if (source === "from" && planet === this.routeForm.value.to) return true
    if (source === "to" && planet === this.routeForm.value.from) return true
    return false
  }

  setBookingRowOpen(index: number) {
    this.routesOffers[index].open = !this.routesOffers[index].open
  }

  saveBooking(routeIndex: number, routeOverview: RoutesRendered): void {
    const booking = this.routesData[routeIndex]
    const savedBooking = {overview: routeOverview, routes: booking}

    LocalStorage.setItem("booking", savedBooking)
    this.appState.booking$.next(savedBooking)
  }
}
