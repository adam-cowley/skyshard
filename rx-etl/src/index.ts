import neo4j, { ResultSummary } from 'neo4j-driver'
import { Observable, merge } from 'rxjs'
import { Flight } from './flight.interface'
import { map, concat, bufferCount, switchMap, distinct, pluck, tap, filter, retry } from 'rxjs/operators'
import Summary from './summary.interface'

import flights$ from './flights'

// Create an instance of the Driver
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'neo'))




// Function to filter stream based on date
const writeFlightsToNeo4j = (batch: Flight[], shard: string): Observable<Summary> => {
    const cypher = `
        USE fabric.${shard}
        UNWIND $batch AS row

        MERGE (origin:Airport {code: row.origin})
        MERGE (destination:Airport {code: row.dest})

        MERGE (f:Flight {id: row.year +'-'+ row.month +'-'+ row.day +'--'+ row.flight})
        SET f.price = coalesce(parseFloat(row.price), f.price)

        MERGE (f)-[:ORIGIN]->(origin)
        MERGE (f)-[:DESTINATION]->(destination)
    `

    const session = driver.rxSession({ defaultAccessMode: neo4j.session.WRITE })

    return session.run(cypher, { batch })
        // @ts-ignore:  https://github.com/neo4j/neo4j-javascript-driver/pull/623
        .consume()
        .pipe(
            // Close the Session
            concat(session.close()),

            // Convert the neo4j ResultSummary into our Summary
            map((result: ResultSummary) => (<Summary>{
                shard,
                writes: result.counters.updates().nodesCreated,
                availableAfter: result.resultAvailableAfter.toNumber()
            }))
        )
}


const writeToShard$ = (flights$: Observable<Flight>, start: Date, end: Date, shard: string): Observable<Summary> => {
    return flights$.pipe(
        // Filter Results by Date
        filter((flight: Flight) => flight.departsAt >= start && flight.departsAt < end),

        // Collect batches of 1000
        bufferCount(1000),

        tap(r => console.log(r)),

        // On the resulting batches, insert into Neo4j
        switchMap((batch: Flight[]) => writeFlightsToNeo4j(batch, shard)),

        // Retry 3 times before giving up
        retry(3)
    )
}

// Process Flights
const jan$ = writeToShard$(flights$, new Date('2013-01-01'), new Date('2013-02-02'), 'january2020')
const feb$ = writeToShard$(flights$, new Date('2013-02-01'), new Date('2013-03-02'), 'february2020')
const mar$ = writeToShard$(flights$, new Date('2013-03-01'), new Date('2013-04-02'), 'march2020')


// Merge into a single Observable
merge(jan$, feb$, mar$)
    // @ts-ignore
    .subscribe({
        next: (summary: Summary) => console.log(
            '🛫 wrote', summary.writes,
            'records to ', summary.shard,
            'in', summary.availableAfter, 'ms'
        ),
        error: (error: Error) => console.error(error),
        complete: () => console.log('Completed import')
    })


