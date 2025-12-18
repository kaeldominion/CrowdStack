"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className={cn("w-full", className)}>
        {children}
      </table>
    </div>
  );
}

export interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn("bg-surface border-b border-border", className)}>
      {children}
    </thead>
  );
}

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-border", className)}>
      {children}
    </tbody>
  );
}

export interface TableRowProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function TableRow({ children, className, hover, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors",
        hover && "hover:bg-surface/50 cursor-pointer",
        onClick && "hover:bg-surface/50 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider",
        className
      )}
    >
      {children}
    </th>
  );
}

export interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-6 py-4 text-sm text-foreground whitespace-nowrap",
        className
      )}
    >
      {children}
    </td>
  );
}

