import { InfluxDB, FluxTableMetaData } from '@influxdata/influxdb-client';
import { NextResponse } from 'next/server';

const url = process.env.INFLUX_URL || 'http://localhost:8086';
const token = process.env.INFLUX_TOKEN || '';
const org = process.env.INFLUX_ORG || 'myems';
const bucket = process.env.INFLUX_BUCKET || 'energy';

export async function GET(request: Request): Promise<NextResponse> {
    console.log('--- API History Call Received ---');
    const { searchParams } = new URL(request.url);
    const sn = searchParams.get('sn');
    const range = searchParams.get('range') || '24h';
    const fieldType = searchParams.get('field') || 'P'; // P for Power, U1 for Voltage, A1 for Amps

    // -- VALIDACIÓN DE SEGURIDAD (Evitar Flux Injection) --
    const snRegex = /^[a-zA-Z0-9_-]+$/;
    if (sn && !snRegex.test(sn)) {
        return NextResponse.json({ error: 'Invalid Serial Number (SN)' }, { status: 400 });
    }

    const rangeRegex = /^\d+[hmdws]$/; // Ej: 24h, 30m, 1h
    if (!rangeRegex.test(range)) {
        return NextResponse.json({ error: 'Invalid Range format (e.g. 24h, 1h)' }, { status: 400 });
    }

    const fieldTypeRegex = /^[a-zA-Z0-9]+$/;
    if (!fieldTypeRegex.test(fieldType)) {
        return NextResponse.json({ error: 'Invalid Field Type' }, { status: 400 });
    }

    if (!token) {
        console.error('SEC-ERR: Missing InfluxDB Token');
        return NextResponse.json({ error: 'Configuración: Falta Token de InfluxDB' }, { status: 500 });
    }

    const client = new InfluxDB({ url, token });
    const queryApi = client.getQueryApi(org);

    // Adaptive aggregation window
    let window = '1h';
    if (range === '7d') window = '6h';
    if (range === '30d') window = '24h';

    // Flux Query adaptado al nuevo formato limpio de Starlark:
    // - Measurement: energy
    // - Tags: port, sn, state
    // - Fields: U1, I1, P1, etc.
    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: -${range})
            |> filter(fn: (r) => r._measurement == "energy")
            ${sn ? `|> filter(fn: (r) => r.sn == "${sn}")` : ''}
            |> filter(fn: (r) => r._field == "${fieldType}")
            |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
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
                        // Reconstruimos el nombre del campo como lo espera el frontend (ej. "0_1_1_U1")
                        field: obj.port ? `${obj.port}_${obj._field}` : obj._field,
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
