import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      include: {
        regions: {
          include: {
            provinces: {
              include: {
                cities: {
                  include: {
                    districts: {
                      include: {
                        sites: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ ok: true, data: countries });
  } catch (error) {
    console.error("[API/geo] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
