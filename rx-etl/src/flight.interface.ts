export interface Flight {
    origin: string;
    destination: string;
    departsAt: Date;
    price?: number;
}