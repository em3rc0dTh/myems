import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const tree = await prisma.site.findMany({
            include: {
                structures: {
                    include: {
                        levels: {
                            include: {
                                rooms: {
                                    include: {
                                        racks: {
                                            include: {
                                                devices: {
                                                    include: {
                                                        equipments: {
                                                            include: {
                                                                ports: true,
                                                                children: {
                                                                    include: {
                                                                        ports: true
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ ok: true, data: tree });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
