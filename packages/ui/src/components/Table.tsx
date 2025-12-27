"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
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
    <thead className={cn("bg-glass border-b border-border-subtle", className)}>
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
    <tbody className={cn("divide-y divide-border-subtle", className)}>
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
        "border-b border-border-subtle transition-all",
        hover && "hover:bg-active hover:border-accent-primary/30 cursor-pointer",
        onClick && "hover:bg-active hover:border-accent-primary/30 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export interface TableHeadProps {
  children?: ReactNode;
  className?: string;
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-secondary",
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
  colSpan?: number;
}

export function TableCell({ children, className, colSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-6 py-4 text-sm text-primary whitespace-nowrap",
        className
      )}
    >
      {children}
    </td>
  );
}

