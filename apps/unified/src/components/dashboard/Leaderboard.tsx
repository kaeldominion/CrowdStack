"use client";

import { Card } from "@crowdstack/ui";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  primaryStat: number | string;
  primaryLabel?: string;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
}

export function Leaderboard({ title, entries }: LeaderboardProps) {
  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400";
      case 2:
        return "bg-gradient-to-r from-slate-300/20 to-slate-400/20 border-slate-400/30 text-slate-300";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30 text-amber-500";
      default:
        return "bg-raised border-border-subtle text-secondary";
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-header">{title}</h2>
          <Trophy className="h-4 w-4 text-accent-warning" />
        </div>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.name}`}
              className={`flex items-center justify-between p-3 rounded-lg border ${getRankStyles(entry.rank)}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold w-6 text-center">
                  {entry.rank}
                </span>
                <span className="text-sm font-medium text-primary">{entry.name}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-primary">{entry.primaryStat}</p>
                {entry.primaryLabel && (
                  <p className="text-[10px] text-muted uppercase tracking-wider">{entry.primaryLabel}</p>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted text-center py-4">No entries yet</p>
          )}
        </div>
      </div>
    </Card>
  );
}

