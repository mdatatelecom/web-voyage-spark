import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';

interface UserScansTableProps {
  data?: Array<{
    user_id: string;
    user_name: string;
    scan_count: number;
  }>;
}

export const UserScansTable = ({ data }: UserScansTableProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Scans por Usuário
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado disponível
        </div>
      </Card>
    );
  }

  const maxScans = Math.max(...data.map((u) => u.scan_count));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Top 10 Usuários
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Scans</TableHead>
            <TableHead>Proporção</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.user_id}>
              <TableCell className="font-medium">{user.user_name}</TableCell>
              <TableCell>{user.scan_count}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted rounded-full h-2 max-w-[200px]">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(user.scan_count / maxScans) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((user.scan_count / maxScans) * 100)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
