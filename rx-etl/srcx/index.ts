// import neo4j from 'neo4j-driver'
import flights$, { Flight } from './flights'
import { filter, take, bufferCount, map, switchMap, pluck, distinct, delay, catchError, retry, retryWhen, tap, mergeAll } from 'rxjs/operators'
import { Observable, merge, concat } from 'rxjs'
import { write } from './neo4j'
import { ResultSummary } from 'neo4j-driver'



// console.log(flights$);


// // @ts-ignore
// flights$.subscribe({
//     next: (val: any) => console.log('next', val),
//     error: (val: any) => console.log('error', val),
//     complete: (val: any) => console.log('complete', val),
// })

// // @ts-ignore
// flights$.pipe(
//     // @ts-ignore
//     filter(n => n % 2 === 0)
// ).subscribe({
//     next: (val: any) => console.log('e next', val),
//     error: (val: any) => console.log('e error', val),
//     complete: (val: any) => console.log('e complete', val),
// })

// @ts-ignore
// flights$
//     .pipe(
//         take(3)
//     )
//     .subscribe({
//         next: (val: any) => console.log('next', val),
//         error: (val: any) => console.log('error', val),
//         complete: (val: any) => console.log('complete', val),
//     })

interface WriteOutput {
    shard: string;
    count: number;
}

const writeToShard$ = (flights$: Observable<Flight>, start: Date, end: Date, shard: string) => {
    return flights$.pipe(
        filter((flight: Flight) => flight.departsAt >= start && flight.arrivesAt < end ),
        bufferCount(1000),

        tap(n => console.log('batch for ', shard, n.length)),
        // map(batch => ({ shard, batch })),
        switchMap(batch => write(`UNWIND $batch AS row RETURN count(*) AS count`, { shard, batch })),
        // map(n => { count: console.log(n.get('count').toNumber())),
        tap(n => console.log(n)),
        // mergeAll(),
        // map(result => result.)
    //     switchMap(batch => write(`
    //         USE fabric.${shard}
    //         UNWIND $batch AS row

    //         WITH row.origin AS origin, collect({id: row.id, destination: row.destination}) AS flights

    //         MERGE (o:Airport {code: origin})
    //         MERGE (f)-[:ORIGIN]->(o)

    //         FOREACH (fx in flights |

    //             MERGE (f:Flight {id: fx.id})
    //             MERGE (destination:Airport {code: fx.destination})
    //             MERGE (f)-[:DESTINATION]->(destination)
    //         )

    //         RETURN count(*) AS count
    //     `, { batch })
    //         .pipe(
    //             map(record => ({ shard, count: record.get('count').toNumber() })),
    //             tap(r => console.log('written', r.count, 'to ', r.shard))
    //         )
    //     ),
    //     // retry(3),
    //     tap(row => console.log(row)),

    )
}


const origins$ = flights$.pipe(
    pluck('origin'),
    distinct(),
)


const destinations$ = flights$.pipe(
    pluck('destination'),
    distinct(),
)

merge(origins$, destinations$)
    .pipe(
        distinct(),
        bufferCount(50),
        // switchMap(batch => write(` USE fabric.airports UNWIND $batch AS code MERGE (a:Airport {code: code})`, { batch })),
//         map((result: ResultSummary) => {
//             /*
//             nodesCreated: 7,
//   nodesDeleted: 0,
//   relationshipsCreated: 0,
//   relationshipsDeleted: 0,
//   propertiesSet: 7,
//   labelsAdded: 7,
//   labelsRemoved: 0,
//   indexesAdded: 0,
//   indexesRemoved: 0,
//   constraintsAdded: 0,
//   constraintsRemoved: 0
//   */
//             // const stats: Record<string, any> = result.counters.updates()
//             // const { nodesCreated, propertiesSet } = stats

//             return {
//                 resultConsumedAfter: result.resultConsumedAfter.toNumber(),
//                 resultAvailableAfter: result.resultAvailableAfter.toNumber(),
//             }
//         })
    )
    .subscribe(n => console.log(n))





// const jan = writeToShard$(flights$, new Date('2013-01-01'), new Date('2013-02-02'), 'january2020')
// const feb = writeToShard$(flights$, new Date('2013-02-03'), new Date('2013-03-02'), 'february2020')
// const mar = writeToShard$(flights$, new Date('2013-03-03'), new Date('2013-04-02'), 'march2020')

// merge(jan, feb) //, mar)
//     .subscribe({
//         next: r => console.log('>>', r),
//         error: e => console.log(!! e),
//         complete: () => console.log('complete')


//     })

//     // .subscribe(({ count, shard }) => console.log('written ', count, ' to', shard))