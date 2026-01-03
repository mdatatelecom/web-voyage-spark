import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Network, 
  Server, 
  Globe, 
  HardDrive, 
  CheckCircle2, 
  Clock, 
  XCircle,
  BarChart3
} from 'lucide-react';
import { useIPAMStats, VlanIPStats, SubnetIPStats } from '@/hooks/useIPAMStats';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

const COLORS = {
  used: '#ef4444',
  available: '#22c55e', 
  reserved: '#f59e0b'
};

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number | string; 
  description?: string; 
  icon: React.ElementType; 
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VlanUsageChart({ data }: { data: VlanIPStats[] }) {
  const chartData = data
    .filter(v => v.total_ips > 0)
    .map(v => ({
      name: `VLAN ${v.vlan_number}`,
      used: v.used_ips,
      available: v.available_ips,
      reserved: v.reserved_ips,
      total: v.total_ips,
      color: v.color
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <p>Nenhuma VLAN com IPs cadastrados</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={80} />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg p-3 shadow-lg">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-green-600">Disponível: {data.available}</p>
                  <p className="text-sm text-red-600">Usado: {data.used}</p>
                  <p className="text-sm text-amber-600">Reservado: {data.reserved}</p>
                  <p className="text-sm text-muted-foreground">Total: {data.total}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="used" stackId="a" fill={COLORS.used} name="Usado" />
        <Bar dataKey="reserved" stackId="a" fill={COLORS.reserved} name="Reservado" />
        <Bar dataKey="available" stackId="a" fill={COLORS.available} name="Disponível" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IPDistributionPie({ summary }: { summary: { used_ips: number; available_ips: number; reserved_ips: number } }) {
  const data = [
    { name: 'Usado', value: summary.used_ips, color: COLORS.used },
    { name: 'Disponível', value: summary.available_ips, color: COLORS.available },
    { name: 'Reservado', value: summary.reserved_ips, color: COLORS.reserved },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        <p>Nenhum IP cadastrado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SubnetList({ data }: { data: SubnetIPStats[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma subnet cadastrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((subnet) => (
        <div key={subnet.subnet_id} className="flex items-center gap-4 p-3 border rounded-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{subnet.subnet_name}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {subnet.cidr}
              </Badge>
              {subnet.vlan_name && (
                <Badge variant="secondary" className="text-xs">
                  VLAN {subnet.vlan_number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {subnet.available_ips} disponíveis
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                {subnet.used_ips} usados
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                {subnet.reserved_ips} reservados
              </span>
            </div>
          </div>
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Ocupação</span>
              <span className={subnet.usage_percent >= 80 ? 'text-red-500' : ''}>
                {subnet.usage_percent}%
              </span>
            </div>
            <Progress 
              value={subnet.usage_percent} 
              className="h-2"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IPAMDashboard() {
  const { summary, vlanStats, subnetStats, isLoading } = useIPAMStats();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Dashboard IPAM
          </h1>
          <p className="text-muted-foreground">
            Visão geral da utilização de endereços IP por VLAN e subnet
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="VLANs"
            value={summary?.total_vlans || 0}
            description="Total de VLANs configuradas"
            icon={Network}
            color="text-blue-500"
          />
          <StatCard
            title="Subnets"
            value={summary?.total_subnets || 0}
            description="Total de sub-redes"
            icon={Server}
            color="text-purple-500"
          />
          <StatCard
            title="IPs Totais"
            value={summary?.total_ips || 0}
            description={`${summary?.available_ips || 0} disponíveis`}
            icon={Globe}
            color="text-green-500"
          />
          <StatCard
            title="Taxa de Uso"
            value={`${summary?.overall_usage_percent || 0}%`}
            description={`${summary?.used_ips || 0} IPs em uso`}
            icon={HardDrive}
            color={summary?.overall_usage_percent && summary.overall_usage_percent >= 80 ? 'text-red-500' : 'text-amber-500'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Utilização por VLAN</CardTitle>
              <CardDescription>
                Distribuição de IPs usados, disponíveis e reservados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VlanUsageChart data={vlanStats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição Geral de IPs</CardTitle>
              <CardDescription>
                Visão geral do status dos endereços IP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary && <IPDistributionPie summary={summary} />}
            </CardContent>
          </Card>
        </div>

        {/* Subnet List */}
        <Card>
          <CardHeader>
            <CardTitle>Ocupação por Subnet</CardTitle>
            <CardDescription>
              Detalhamento da utilização de IPs em cada sub-rede
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubnetList data={subnetStats} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
