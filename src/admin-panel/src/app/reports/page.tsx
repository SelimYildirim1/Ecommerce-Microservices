"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getConversionReport,
  getCustomerReport,
  getProductReport,
  getReturnReport,
  getSalesReport,
  getStockReport,
} from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";

const RANGES = [
  { value: 7, label: "7 gün" },
  { value: 30, label: "30 gün" },
  { value: 90, label: "90 gün" },
  { value: 365, label: "1 yıl" },
];

export default function ReportsPage() {
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <p className="text-sm text-muted-foreground">
            Satış, ürün, müşteri, stok ve iade performansı.
          </p>
        </div>

        <div className="flex gap-2">
          {RANGES.map((range) => (
            <Button
              key={range.value}
              size="sm"
              variant={days === range.value ? "default" : "outline"}
              onClick={() => setDays(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Satış</TabsTrigger>
          <TabsTrigger value="products">Ürün</TabsTrigger>
          <TabsTrigger value="customers">Müşteri</TabsTrigger>
          <TabsTrigger value="conversion">Dönüşüm</TabsTrigger>
          <TabsTrigger value="stock">Stok</TabsTrigger>
          <TabsTrigger value="returns">İade</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <SalesReportView days={days} />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <ProductReportView days={days} />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <CustomerReportView days={days} />
        </TabsContent>
        <TabsContent value="conversion" className="mt-4">
          <ConversionReportView days={days} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockReportView />
        </TabsContent>
        <TabsContent value="returns" className="mt-4">
          <ReturnReportView days={days} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Loading() {
  return <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>;
}

function SalesReportView({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-sales", days],
    queryFn: () => getSalesReport(days),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Ciro", value: formatCurrency(data.totalRevenue) },
          { label: "Sipariş", value: data.totalOrders },
          { label: "Ortalama sepet", value: formatCurrency(data.averageOrderValue) },
          { label: "Toplam indirim", value: formatCurrency(data.totalDiscount) },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Günlük ciro</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => `Tarih: ${label}`}
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Ciro" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Duruma göre siparişler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Durum</TableHead>
                <TableHead>Adet</TableHead>
                <TableHead>Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Bu aralıkta sipariş yok.
                  </TableCell>
                </TableRow>
              ) : (
                data.byStatus.map((row) => {
                  const status = ORDER_STATUS_MAP[row.status] ?? {
                    label: row.status,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={row.status}>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductReportView({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-products", days],
    queryFn: () => getProductReport(days),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Satılan adet", value: data.totalUnitsSold },
          { label: "Satan ürün çeşidi", value: data.distinctProductsSold },
          { label: "Hiç satmayan", value: data.neverSold.length },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>En çok satanlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Adet</TableHead>
                <TableHead>Ciro</TableHead>
                <TableHead>Sipariş</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.bestSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Bu aralıkta satış yok.
                  </TableCell>
                </TableRow>
              ) : (
                data.bestSellers.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell>{row.unitsSold}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>{row.orderCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hiç satmayan ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.neverSold.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Tüm aktif ürünlerden satış var.
                  </TableCell>
                </TableRow>
              ) : (
                data.neverSold.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.categoryName}
                    </TableCell>
                    <TableCell>{row.stock}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerReportView({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers", days],
    queryFn: () => getCustomerReport(days),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Toplam müşteri", value: data.totalCustomers },
          { label: "Yeni üye", value: data.newCustomers },
          { label: "Alışveriş yapan", value: data.purchasingCustomers },
          { label: "Engelli hesap", value: data.blockedCustomers },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>En çok harcayanlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Sipariş</TableHead>
                <TableHead>Harcama</TableHead>
                <TableHead>Son sipariş</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Henüz satış yok.
                  </TableCell>
                </TableRow>
              ) : (
                data.topCustomers.map((row) => (
                  <TableRow key={row.buyerId}>
                    <TableCell className="font-medium">{row.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email}</TableCell>
                    <TableCell>{row.orderCount}</TableCell>
                    <TableCell>{formatCurrency(row.totalSpent)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.lastOrderDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yeni üyeler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.newUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Bu aralıkta yeni üye yok.
                  </TableCell>
                </TableRow>
              ) : (
                data.newUsers.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isBlocked ? "destructive" : "secondary"}>
                        {row.isBlocked ? "Engelli" : "Aktif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StockReportView() {
  const [lowStockOnly, setLowStockOnly] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["report-stock", lowStockOnly],
    queryFn: () => getStockReport(lowStockOnly),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Toplam varyant", value: data.totalVariants },
          { label: "Stoğu biten", value: data.outOfStockCount },
          { label: "Kritik stok", value: data.lowStockCount },
          { label: "Stok değeri", value: formatCurrency(data.stockValue) },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{data.lines.length} varyant</CardTitle>
          <Button
            size="sm"
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => setLowStockOnly((v) => !v)}
          >
            Sadece kritik stok
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                data.lines.map((line) => (
                  <TableRow key={line.variantId}>
                    <TableCell className="font-medium">{line.productName}</TableCell>
                    <TableCell className="text-sm">{line.sku}</TableCell>
                    <TableCell>{formatCurrency(line.price)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={line.stockQuantity <= 0 ? "destructive" : "secondary"}
                      >
                        {line.stockQuantity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnReportView({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-returns", days],
    queryFn: () => getReturnReport(days),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "İade talebi", value: data.totalRequests },
          { label: "Onay bekleyen", value: data.pendingRequests },
          { label: "İade edilen tutar", value: formatCurrency(data.totalRefunded) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Duruma göre</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Durum</TableHead>
                  <TableHead>Adet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.byStatus ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Bu aralıkta iade yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byStatus!.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nedene göre</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Neden</TableHead>
                  <TableHead>Adet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.byReason ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Bu aralıkta iade yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byReason!.map((row) => (
                    <TableRow key={row.reason}>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConversionReportView({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-conversion", days],
    queryFn: () => getConversionReport(days),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: "Yeni üye", value: data.newUsers },
          { label: "Sipariş", value: data.totalOrders },
          { label: "Ödeme alan", value: data.paidOrders },
          { label: "Teslim", value: data.deliveredOrders },
        ]}
      />

      <StatGrid
        items={[
          { label: "Üye → Sipariş %", value: `%${data.registrationToOrderRate}` },
          { label: "Sipariş → Ödeme %", value: `%${data.orderToPaidRate}` },
          { label: "Ödeme → Teslim %", value: `%${data.paidToDeliveredRate}` },
          { label: "İptal", value: data.cancelledOrders },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Dönüşüm hunisi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.stages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Adet" />
            </BarChart>
          </ResponsiveContainer>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Aşama</TableHead>
                <TableHead>Adet</TableHead>
                <TableHead>Oran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.stages.map((stage) => (
                <TableRow key={stage.key}>
                  <TableCell>{stage.label}</TableCell>
                  <TableCell>{stage.count}</TableCell>
                  <TableCell>%{stage.rate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
