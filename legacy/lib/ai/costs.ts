/**
 * AI Cost Tracking - Monitor API spending by model, task type, and user
 * Helps identify cost optimization opportunities
 */

interface CostRecord {
  timestamp: Date;
  model: string;
  taskType: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  userId?: string;
  requestId: string;
}

class CostTracker {
  private records: CostRecord[] = [];
  private costMap: Map<string, number> = new Map();

  /**
   * Record an API call
   */
  recordCall(
    model: string,
    taskType: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    requestId: string,
    userId?: string
  ): void {
    const record: CostRecord = {
      timestamp: new Date(),
      model,
      taskType,
      promptTokens,
      completionTokens,
      cost,
      userId,
      requestId,
    };

    this.records.push(record);

    // Update cost map
    const key = model;
    this.costMap.set(key, (this.costMap.get(key) || 0) + cost);
  }

  /**
   * Get total cost for a specific model
   */
  getCostByModel(model: string): number {
    return this.costMap.get(model) || 0;
  }

  /**
   * Get total cost for a specific task type
   */
  getCostByTaskType(taskType: string): number {
    return this.records
      .filter(r => r.taskType === taskType)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get cost breakdown by model
   */
  getCostBreakdownByModel(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    this.costMap.forEach((cost, model) => {
      breakdown[model] = cost;
    });
    return breakdown;
  }

  /**
   * Get cost breakdown by task type
   */
  getCostBreakdownByTaskType(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    this.records.forEach(record => {
      const key = record.taskType;
      breakdown[key] = (breakdown[key] || 0) + record.cost;
    });
    return breakdown;
  }

  /**
   * Get total API costs
   */
  getTotalCost(): number {
    return Array.from(this.costMap.values()).reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Get stats for a time period
   */
  getStatsForPeriod(startDate: Date, endDate: Date): {
    totalCost: number;
    totalTokens: number;
    callCount: number;
    avgCostPerCall: number;
    costByModel: Record<string, number>;
    costByTaskType: Record<string, number>;
  } {
    const filtered = this.records.filter(r => r.timestamp >= startDate && r.timestamp <= endDate);

    const totalCost = filtered.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = filtered.reduce((sum, r) => sum + r.promptTokens + r.completionTokens, 0);
    const callCount = filtered.length;

    const costByModel: Record<string, number> = {};
    const costByTaskType: Record<string, number> = {};

    filtered.forEach(record => {
      costByModel[record.model] = (costByModel[record.model] || 0) + record.cost;
      costByTaskType[record.taskType] = (costByTaskType[record.taskType] || 0) + record.cost;
    });

    return {
      totalCost,
      totalTokens,
      callCount,
      avgCostPerCall: callCount > 0 ? totalCost / callCount : 0,
      costByModel,
      costByTaskType,
    };
  }

  /**
   * Get all records (for detailed analysis)
   */
  getAllRecords(): CostRecord[] {
    return [...this.records];
  }

  /**
   * Clear records (for testing or fresh start)
   */
  clearRecords(): void {
    this.records = [];
    this.costMap.clear();
  }

  /**
   * Export stats as formatted string (for logging/reporting)
   */
  exportStats(startDate?: Date, endDate?: Date): string {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const stats = this.getStatsForPeriod(start, end);

    let output = `\n📊 AI API Cost Report\n`;
    output += `Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Total Cost: $${stats.totalCost.toFixed(4)}\n`;
    output += `Total Tokens: ${stats.totalTokens.toLocaleString()}\n`;
    output += `API Calls: ${stats.callCount}\n`;
    output += `Avg Cost/Call: $${stats.avgCostPerCall.toFixed(4)}\n\n`;

    output += `💰 Cost by Model:\n`;
    Object.entries(stats.costByModel)
      .sort(([, a], [, b]) => b - a)
      .forEach(([model, cost]) => {
        const percent = ((cost / stats.totalCost) * 100).toFixed(1);
        output += `  ${model}: $${cost.toFixed(4)} (${percent}%)\n`;
      });

    output += `\n📈 Cost by Task Type:\n`;
    Object.entries(stats.costByTaskType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([taskType, cost]) => {
        const percent = ((cost / stats.totalCost) * 100).toFixed(1);
        output += `  ${taskType}: $${cost.toFixed(4)} (${percent}%)\n`;
      });

    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    return output;
  }
}

// Global singleton instance
let trackerInstance: CostTracker | null = null;

/**
 * Get the global cost tracker instance
 */
export function getCostTracker(): CostTracker {
  if (!trackerInstance) {
    trackerInstance = new CostTracker();
  }
  return trackerInstance;
}

export type { CostRecord };
export default CostTracker;
