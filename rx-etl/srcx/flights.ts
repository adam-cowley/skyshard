import csv from 'csv-parser'
import fs from 'fs'
import moment from 'moment'

import { read } from './neo4j'

import { Subject, interval, fromEvent, Observable } from 'rxjs'
import { map, withLatestFrom, takeUntil } from 'rxjs/operators'

const subject$ = new Subject()


const readStream = fs.createReadStream(__dirname +'/../data/flights.csv').pipe(csv())

const finished$ = fromEvent(readStream, 'end')

const readCsv$: Observable<CSVLine> = fromEvent(readStream, 'data')
    // @ts-ignore
    .pipe( takeUntil(finished$) )


export interface Flight {
    id: string,
    departsAt: Date,
    arrivesAt: Date,
    origin: string;
    destination: string;
    price: string;
}

interface CSVLine {
    year: string; // '2013',
    month: string; //'1',
    day: string; //'1',
    dep_time: string; //'542',
    sched_dep_time: string; //'540',
    dep_delay: string; //'2',
    arr_time: string; //'923',
    sched_arr_time: string; //'850',
    arr_delay: string; //'33',
    carrier: string; //'AA',
    flight: string; //'1141',
    tailnum: string; //'N619AA',
    origin: string; //'JFK',
    dest: string; //'MIA',
    air_time: string; //'160',
    distance: string; //'1089',
    hour: string; //'5',
    minute: string; //'40',
    time_hour: string; //'2013-01-01T05:00:00Z'
}

readCsv$.subscribe(subject$)




const flights$: Observable<Flight> = subject$.asObservable().pipe(
    // @ts-ignore
    map((row: CSVLine): Flight => {
        const departsAt = moment(row.time_hour)
        const arrivesAt = departsAt.clone()
        arrivesAt.add(row.air_time, 'm')

        return <Flight> {
            // ...row,
            id: `${departsAt.format('YYYY-MM-DD')}--${row.flight}`,
            departsAt: departsAt.toDate(),
            arrivesAt: arrivesAt.toDate(),
            origin: row.origin,
            destination: row.dest,
            price: (Math.random() * 1000).toFixed(2)

        }
    })
)

subject$.next({
    id: Math.random().toString(),
    departsAt: new Date(''),
    arrivesAt: new Date(),
    origin: 'LCY',
    destination: 'LHR',
    price: (Math.random() * 1000).toFixed(2)
})

// subject$.complete()

export default flights$