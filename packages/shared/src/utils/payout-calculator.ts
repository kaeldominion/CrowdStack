/**
 * Shared payout calculation logic for promoters
 * Used in closeout, earnings API, dashboard stats, and PDF exports
 */

export interface BonusTier {
  threshold: number;
  amount: number;
  repeatable?: boolean; // true = every X guests, false = one-time milestone
  label?: string;
}

export interface PromoterContract {
  per_head_rate: number | null;
  per_head_min: number | null;
  per_head_max: number | null;
  fixed_fee: number | null;
  minimum_guests: number | null;
  below_minimum_percent: number | null; // e.g., 50 means 50% of fixed_fee if below minimum
  bonus_threshold: number | null; // Legacy single bonus
  bonus_amount: number | null; // Legacy single bonus
  bonus_tiers: BonusTier[] | null; // New tiered bonuses
  manual_adjustment_amount: number | null;
}

export interface PayoutBreakdown {
  per_head_amount: number;
  per_head_rate: number | null;
  per_head_counted: number; // After min/max constraints
  fixed_fee_amount: number;
  fixed_fee_full: number | null;
  fixed_fee_percent_applied: number | null; // 100 = full, 50 = half, etc.
  bonus_amount: number;
  bonus_details: Array<{
    type: "legacy" | "tier" | "repeatable";
    threshold: number;
    amount: number;
    label?: string;
    times_earned?: number; // For repeatable bonuses
  }>;
  calculated_payout: number;
  manual_adjustment: number;
  final_payout: number;
}

/**
 * Calculate the full payout for a promoter based on their contract and check-in count
 */
export function calculatePromoterPayout(
  contract: PromoterContract,
  effectiveCheckinsCount: number
): PayoutBreakdown {
  let perHeadAmount = 0;
  let perHeadCounted = 0;
  let fixedFeeAmount = 0;
  let fixedFeePercentApplied: number | null = null;
  let bonusAmount = 0;
  const bonusDetails: PayoutBreakdown["bonus_details"] = [];

  // === PER-HEAD CALCULATION ===
  if (contract.per_head_rate !== null && contract.per_head_rate !== undefined) {
    perHeadCounted = effectiveCheckinsCount;

    // Apply min/max constraints
    if (contract.per_head_min !== null && perHeadCounted < contract.per_head_min) {
      perHeadCounted = 0; // Below minimum, no per-head payment
    } else if (contract.per_head_max !== null && perHeadCounted > contract.per_head_max) {
      perHeadCounted = contract.per_head_max; // Cap at maximum
    }

    perHeadAmount = perHeadCounted * (contract.per_head_rate || 0);
  }

  // === FIXED FEE CALCULATION ===
  if (contract.fixed_fee !== null && contract.fixed_fee !== undefined) {
    const fullFixedFee = contract.fixed_fee;

    // Check if below minimum guests threshold
    if (
      contract.minimum_guests !== null &&
      effectiveCheckinsCount < contract.minimum_guests
    ) {
      // Apply below_minimum_percent (default to 100% if not set)
      const percent = contract.below_minimum_percent ?? 100;
      fixedFeePercentApplied = percent;
      fixedFeeAmount = (fullFixedFee * percent) / 100;
    } else {
      fixedFeePercentApplied = 100;
      fixedFeeAmount = fullFixedFee;
    }
  }

  // === BONUS CALCULATION ===

  // First, check tiered bonuses (new system takes precedence)
  if (contract.bonus_tiers && Array.isArray(contract.bonus_tiers) && contract.bonus_tiers.length > 0) {
    for (const tier of contract.bonus_tiers) {
      if (tier.repeatable) {
        // Repeatable bonus: earned every X guests
        const timesEarned = Math.floor(effectiveCheckinsCount / tier.threshold);
        if (timesEarned > 0) {
          const tierBonus = timesEarned * tier.amount;
          bonusAmount += tierBonus;
          bonusDetails.push({
            type: "repeatable",
            threshold: tier.threshold,
            amount: tier.amount,
            label: tier.label,
            times_earned: timesEarned,
          });
        }
      } else {
        // Milestone bonus: one-time when threshold is reached
        if (effectiveCheckinsCount >= tier.threshold) {
          bonusAmount += tier.amount;
          bonusDetails.push({
            type: "tier",
            threshold: tier.threshold,
            amount: tier.amount,
            label: tier.label,
          });
        }
      }
    }
  } else if (
    // Legacy single bonus (fallback if no tiered bonuses)
    contract.bonus_threshold !== null &&
    contract.bonus_amount !== null &&
    effectiveCheckinsCount >= contract.bonus_threshold
  ) {
    bonusAmount += contract.bonus_amount;
    bonusDetails.push({
      type: "legacy",
      threshold: contract.bonus_threshold,
      amount: contract.bonus_amount,
    });
  }

  // === TOTALS ===
  const calculatedPayout = perHeadAmount + fixedFeeAmount + bonusAmount;
  const manualAdjustment = contract.manual_adjustment_amount || 0;
  const finalPayout = calculatedPayout + manualAdjustment;

  return {
    per_head_amount: perHeadAmount,
    per_head_rate: contract.per_head_rate,
    per_head_counted: perHeadCounted,
    fixed_fee_amount: fixedFeeAmount,
    fixed_fee_full: contract.fixed_fee,
    fixed_fee_percent_applied: fixedFeePercentApplied,
    bonus_amount: bonusAmount,
    bonus_details: bonusDetails,
    calculated_payout: calculatedPayout,
    manual_adjustment: manualAdjustment,
    final_payout: finalPayout,
  };
}

/**
 * Format a payout breakdown into a human-readable string for display
 */
export function formatPayoutBreakdown(
  breakdown: PayoutBreakdown,
  currency: string
): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const parts: string[] = [];

  if (breakdown.per_head_amount > 0) {
    parts.push(
      `${breakdown.per_head_counted} check-ins × ${formatCurrency(breakdown.per_head_rate || 0)} = ${formatCurrency(breakdown.per_head_amount)}`
    );
  }

  if (breakdown.fixed_fee_amount > 0) {
    if (breakdown.fixed_fee_percent_applied !== null && breakdown.fixed_fee_percent_applied < 100) {
      parts.push(
        `Fixed fee: ${formatCurrency(breakdown.fixed_fee_full || 0)} × ${breakdown.fixed_fee_percent_applied}% = ${formatCurrency(breakdown.fixed_fee_amount)}`
      );
    } else {
      parts.push(`Fixed fee: ${formatCurrency(breakdown.fixed_fee_amount)}`);
    }
  }

  for (const bonus of breakdown.bonus_details) {
    if (bonus.type === "repeatable" && bonus.times_earned) {
      parts.push(
        `Bonus: ${formatCurrency(bonus.amount)} × ${bonus.times_earned} (every ${bonus.threshold} guests)${bonus.label ? ` - ${bonus.label}` : ""}`
      );
    } else {
      parts.push(
        `Bonus: ${formatCurrency(bonus.amount)} (${bonus.threshold}+ guests)${bonus.label ? ` - ${bonus.label}` : ""}`
      );
    }
  }

  if (breakdown.manual_adjustment !== 0) {
    const sign = breakdown.manual_adjustment > 0 ? "+" : "";
    parts.push(`Manual adjustment: ${sign}${formatCurrency(breakdown.manual_adjustment)}`);
  }

  return parts.join(" + ");
}
