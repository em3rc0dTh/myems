import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const siteName = searchParams.get('siteName');

        if (!siteName) {
            return NextResponse.json({ error: 'siteName is required' }, { status: 400 });
        }

        const site = await prisma.site.findFirst({
            where: { name: siteName },
            include: {
                structures: {
                    include: {
                        levels: {
                            include: {
                                rooms: { // Rooms
                                    include: {
                                        racks: true,
                                        positions: { // Physical usage
                                            include: {
                                                device: {
                                                    include: {
                                                        equipments: {
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
        });

        return NextResponse.json(site);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
