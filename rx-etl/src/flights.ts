import csv from "csv-parser"
import fs from "fs"
import { Observable, fromEvent } from "rxjs"
import { Flight } from "./flight.interface"
import { map, takeUntil, share } from "rxjs/operators"

// Read csv lines into an Observable
const file = __dirname + '/../data/flights.csv'
const readStreamEventEmitter = fs.createReadStream(file).pipe(csv())

// Observable will emit when the entire file has been read
const readCsvFinished$: Observable<void> = fromEvent(readStreamEventEmitter, 'done')

// Stream of objects representing CSV rows
const flights$: Observable<Flight> = fromEvent(readStreamEventEmitter, 'data')
    .pipe(
        map(input => {
            // ts type hinting :/
            const row = <Record<string, string>>input

            const departsAt = new Date(row.time_hour)

            return <Flight>{
                origin: row.origin,
                destination: row.dest,
                departsAt,
            }
        }),
        takeUntil(readCsvFinished$),
        share()
    )

export default flights$