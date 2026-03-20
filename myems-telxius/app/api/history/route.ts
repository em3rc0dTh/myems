import { InfluxDB, FluxTableMetaData } from '@influxdata/influxdb-client';
import { NextResponse } from 'next/server';

const url = process.env.NEXT_PUBLIC_INFLUX_URL || 'http://localhost:8086';
const token = process.env.NEXT_PUBLIC_INFLUX_TOKEN || '';
const org = process.env.NEXT_PUBLIC_INFLUX_ORG || 'myems';
const bucket = process.env.NEXT_PUBLIC_INFLUX_BUCKET || 'energy';

export async function GET(request: Request): Promise<NextResponse> {
    console.log('--- API History Call Received ---');
    const { searchParams } = new URL(request.url);
    const sn = searchParams.get('sn');
    const range = searchParams.get('range') || '24h';
    const fieldType = searchParams.get('field') || 'P'; // P for Power, U1 for Voltage, A1 for Amps

    if (!token) {
        return NextResponse.json({ error: 'InfluxDB Token not configured' }, { status: 500 });
    }

    const client = new InfluxDB({ url, token });
    const queryApi = client.getQueryApi(org);

    // Flux Query: 
    // - Measurement: mqtt_consumer (written by Telegraf)
    // - Fields: Look for fields ending in _P, _U1, or _A1 (flattened by Telegraf json_v2)
    // - Filter by SN tag if it exists in the data
    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: -${range})
            |> filter(fn: (r) => r._measurement == "mqtt_consumer")
            ${sn ? `|> filter(fn: (r) => r.sn == "${sn}")` : ''}
            |> filter(fn: (r) => r._field =~ /.+_${fieldType}$/)
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
            |> yield(name: "mean")
    `;

    try {
        const data: { time: string, field: string, value: number, sn: string }[] = [];
        return new Promise<NextResponse>((resolve) => {
            queryApi.queryRows(fluxQuery, {
                next(row: string[], tableMeta: FluxTableMetaData) {
                    const obj = tableMeta.toObject(row);
                    data.push({
                        time: obj._time,
                        field: obj._field,
                        value: obj._value,
                        sn: obj.sn
                    });
                },
                error(err: Error) {
                    console.error('InfluxQuery Error:', err);
                    resolve(NextResponse.json({ error: (err as Error).message }, { status: 500 }));
                },
                complete() {
                    resolve(NextResponse.json(data));
                },
            });
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
