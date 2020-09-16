import { concat, map } from 'rxjs/operators'
import neo4j, { ResultSummary } from 'neo4j-driver'
import { Observable } from 'rxjs'

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'neo'))

export interface Summary {
    writes: number;
    availableAfter: number;
}

export const read = (cypher: string, params: object) => {
    const session = driver.rxSession({ defaultAccessMode: neo4j.session.READ })

    return session.run(cypher, params)
        .records()
        .pipe(concat(session.close()))
}

export const write = (cypher: string, params: object): Observable<Summary> => {
    const session = driver.rxSession({ defaultAccessMode: neo4j.session.WRITE })

    return session.run(cypher, params)
    // @ts-ignore
        .consume()
        .pipe(
            concat(session.close()),
            map((result: ResultSummary) => (<Summary> { writes: result.counters.updates().nodesCreated, availableAfter: result.resultAvailableAfter.toNumber() }))
        )

}


