import flights$ from './flights'
import { pluck, distinct, bufferCount } from 'rxjs/operators'

// Airports
flights$.pipe(
    pluck('destination'),
    distinct(),
    bufferCount(50),
).subscribe({
    next: batch => console.log('🏢', batch),
    error: error => console.error('🏢', error),
    complete: () => console.log('🏢 Complete')
})
