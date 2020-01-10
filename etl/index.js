const csv = require('csv-parser')
const fs = require('fs')
const neo4j = require('neo4j-driver')


/*
CSV Structure:
year,month,day,dep_time,sched_dep_time,dep_delay,arr_time,sched_arr_time,arr_delay,carrier,flight,tailnum,origin,dest,air_time,distance,hour,minute,time_hour
2013,1,1,517,515,2,830,819,11,UA,1545,N14228,EWR,IAH,227,1400,5,15,2013-01-01T05:00:00Z
2013,1,1,533,529,4,850,830,20,UA,1714,N24211,LGA,IAH,227,1416,5,29,2013-01-01T05:00:00Z
*/



// Create a quick mapping between the month and the shard
const shards = {
    '1': 'january2020',
    '2': 'february2020',
    '3': 'march2020',
    // ...
}

// Batch Size
const batch_size = 1000

const readFromCsv = file => {
    let rows = 0;

    const results = {
        '1': [],
        '2': [],
        '3': [],
    };

    return new Promise((resolve, reject) => {
        fs.createReadStream(file)
            .pipe(csv())
            .on('data', async row => {
                rows++;
                // Add to current month
                if ( results[ row.month ] ) {
                    results[ row.month ].push(row)
                }

                // Allow for 48 hours of the next month to be added to the previous month
                const nextMonth = ( parseInt(row.month) - 1 ).toString();
                if ( results[ nextMonth ] && parseInt(row.day) <= 2 ) {
                    results[ nextMonth ].push(row)
                }
            })
            .on('end', () => {
                console.log(`Imported ${rows} rows`)
                resolve(results)
            })
    })
}


const importMonth = async (driver, key, data) => {
    const session = driver.session({ database: "fabric" })

    const shard = shards[ key ]
    const query = `
        USE fabric.${shard}
        UNWIND $batch AS row
        
        MERGE (origin:Airport {code: row.origin})
        MERGE (destination:Airport {code: row.dest})
        
        MERGE (f:Flight {id: row.year +'-'+ row.month +'-'+ row.day +'--'+ row.flight})
        
        MERGE (f)-[:ORIGIN]->(origin)
        MERGE (f)-[:DESTINATION]->(destination)
    `

    console.log(`Importing ${data.length} rows to ${shard}`)
    // console.log(query)

    // While there are still rows left, splice the next X number of rows
    // and run an autocommit transaction
    while ( data.length ) {
        const batch = data.splice(0, batch_size)

        await session.run(query, { batch })
    }
}


const run = async () => {
    // Create Driver instance
    const driver = new neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'neo'))

    // Organise rows from CSV into shard
    const results = await readFromCsv(__dirname + '/data/flights.csv')

    // Send data to each shard
    await Promise.all(
        Object.entries(results)
            .map(async ([key, value]) => importMonth(driver, key, value))
    )

    // Finished, close the driver
    driver.close()

    console.log('Finished!')
}

run()
