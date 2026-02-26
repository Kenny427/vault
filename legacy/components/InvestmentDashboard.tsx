'use client';

import React, { useState, useEffect } from 'react';

interface InvestmentSignal {
  itemId: number;
  itemName: string;
  currentPrice: number;
  targetSellPrice: number;
  stopLoss: number;
  reversionPotential: number;
  confidenceScore: number;
  investmentGrade: string;
  estimatedHoldingPeriod: string;
  suggestedInvestment: number;
  reasoning: string;
  maxDeviation: number;
  liquidityScore: number;
  botLikelihood: string;
  aiInsight?: {
    priceChangeType: string;
    marketSentiment: string;
    recommendation: string;
    reasoning: string;
    risks: string[];
    opportunities: string[];
  };
  shortTerm: { avgPrice: number; currentDeviation: number };
  mediumTerm: { avgPrice: number; currentDeviation: number };
  longTerm: { avgPrice: number; currentDeviation: number };
}

interface PortfolioRecommendation {
  totalInvestment: number;
  expectedReturn: number;
  holdings: any[];
  strategy: string;
  riskLevel: string;
  timeHorizon: string;
}

export default function InvestmentDashboard() {
  const [signals, setSignals] = useState<InvestmentSignal[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<'opportunities' | 'portfolio'>('opportunities');
  
  useEffect(() => {
    loadInvestmentSignals();
  }, []);
  
  const loadInvestmentSignals = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh 
        ? '/api/investment-signals?refreshAI=true&limit=30'
        : '/api/investment-signals?limit=30';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setSignals(data.signals || []);
        setPortfolio(data.portfolioRecommendation || null);
        setAiMetadata(data.aiAnalysis);
      }
    } catch (error) {
      console.error('Failed to load investment signals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'bg-green-900/30 text-green-400 border-green-500/30';
    if (grade === 'B+' || grade === 'B') return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
    return 'bg-slate-700 text-slate-400 border-slate-600';
  };
  
  const getSentimentIcon = (sentiment?: string) => {
    if (sentiment === 'bullish') return '📈';
    if (sentiment === 'bearish') return '📉';
    return '📊';
  };
  
  const formatGP = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl animate-spin mb-4">⏳</div>
          <p className="text-slate-300">Analyzing market opportunities...</p>
          <p className="text-sm text-slate-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">💎 Investment Dashboard</h1>
          <p className="text-slate-400 mt-1">Mean-Reversion Value Investing Strategy</p>
        </div>
        <button 
          onClick={() => loadInvestmentSignals(true)} 
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-100"
        >
          🔄 Refresh Analysis
        </button>
      </div>
      
      {/* AI Status Banner */}
      {aiMetadata && (
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🧠</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-300">AI-Enhanced Analysis</h3>
              <p className="text-sm text-blue-200 mt-1">{aiMetadata.marketOverview}</p>
              <p className="text-xs text-blue-400 mt-2">
                Generated: {new Date(aiMetadata.generatedAt).toLocaleDateString()} • 
                Expires: {new Date(aiMetadata.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Opportunities</p>
              <p className="text-2xl font-bold text-slate-100">{signals.length}</p>
            </div>
            <span className="text-3xl">🎯</span>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Avg Potential</p>
              <p className="text-2xl font-bold text-green-500">
                {signals.length > 0
                  ? `${(signals.reduce((sum, s) => sum + s.reversionPotential, 0) / signals.length).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
            <span className="text-3xl">📈</span>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-slate-100">{formatGP(portfolio?.totalInvestment || 0)}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Expected Return</p>
              <p className="text-2xl font-bold text-green-500">
                {portfolio ? `${portfolio.expectedReturn.toFixed(1)}%` : '0%'}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setSelectedView('opportunities')}
          className={`px-4 py-3 font-semibold transition-all ${
            selectedView === 'opportunities'
              ? 'text-osrs-accent border-b-2 border-osrs-accent'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Investment Opportunities
        </button>
        <button
          onClick={() => setSelectedView('portfolio')}
          className={`px-4 py-3 font-semibold transition-all ${
            selectedView === 'portfolio'
              ? 'text-osrs-accent border-b-2 border-osrs-accent'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Recommended Portfolio
        </button>
      </div>
      
      {/* Opportunities View */}
      {selectedView === 'opportunities' && (
        <div className="space-y-4">
          {signals.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No investment opportunities found. Try refreshing the analysis.
            </div>
          )}
          {signals.map((signal) => (
            <div key={signal.itemId} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-100">{signal.itemName}</h3>
                    <span className={`px-2 py-1 rounded text-sm font-semibold border ${getGradeColor(signal.investmentGrade)}`}>
                      {signal.investmentGrade}
                    </span>
                    {signal.aiInsight && (
                      <span className="px-2 py-1 rounded text-sm font-semibold bg-blue-900/30 text-blue-400 border border-blue-500/30">
                        🧠 AI Enhanced
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{signal.reasoning}</p>
                </div>
                {signal.aiInsight && <span className="text-2xl">{getSentimentIcon(signal.aiInsight.marketSentiment)}</span>}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Current Price</p>
                  <p className="text-lg font-semibold text-slate-200">{formatGP(signal.currentPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Target Price</p>
                  <p className="text-lg font-semibold text-green-500">{formatGP(signal.targetSellPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Upside Potential</p>
                  <p className="text-lg font-semibold text-green-500">+{signal.reversionPotential.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className="text-lg font-semibold text-slate-200">{signal.confidenceScore.toFixed(0)}%</p>
                </div>
              </div>
              
              {/* Price Deviation Chart */}
              <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold mb-3 text-slate-300">Price vs Historical Average</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">7 Days:</span>
                    <span className="text-red-400">
                      {signal.shortTerm.currentDeviation.toFixed(1)}% below avg ({formatGP(signal.shortTerm.avgPrice)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">90 Days:</span>
                    <span className="text-red-400">
                      {signal.mediumTerm.currentDeviation.toFixed(1)}% below avg ({formatGP(signal.mediumTerm.avgPrice)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">365 Days:</span>
                    <span className="text-red-400">
                      {signal.longTerm.currentDeviation.toFixed(1)}% below avg ({formatGP(signal.longTerm.avgPrice)})
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Investment Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <span>⏱️</span>
                  <span>{signal.estimatedHoldingPeriod}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>💵</span>
                  <span>Invest: {formatGP(signal.suggestedInvestment)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>⚠️</span>
                  <span>Stop: {formatGP(signal.stopLoss)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>💧</span>
                  <span>Liquidity: {signal.liquidityScore}/100</span>
                </div>
              </div>
              
              {/* AI Insights */}
              {signal.aiInsight && (
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <p className="text-sm font-semibold text-blue-300 mb-2">🧠 AI Analysis</p>
                  <p className="text-sm text-blue-200 mb-2">{signal.aiInsight.reasoning}</p>
                  {signal.aiInsight.opportunities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-blue-400">Opportunities:</p>
                      <ul className="text-xs text-blue-300 list-disc list-inside">
                        {signal.aiInsight.opportunities.map((opp, i) => <li key={i}>{opp}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Portfolio View */}
      {selectedView === 'portfolio' && portfolio && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Recommended Diversified Portfolio</h2>
          <p className="text-sm text-slate-400 mb-6">{portfolio.strategy}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-900/20 rounded-lg">
              <p className="text-sm text-slate-400">Total Investment</p>
              <p className="text-2xl font-bold text-blue-400">{formatGP(portfolio.totalInvestment)}</p>
            </div>
            <div className="p-4 bg-green-900/20 rounded-lg">
              <p className="text-sm text-slate-400">Expected Return</p>
              <p className="text-2xl font-bold text-green-400">{portfolio.expectedReturn.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-purple-900/20 rounded-lg">
              <p className="text-sm text-slate-400">Time Horizon</p>
              <p className="text-2xl font-bold text-purple-400">{portfolio.timeHorizon}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {portfolio.holdings.map((holding, idx) => (
              <div key={idx} className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-900 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-200">{holding.itemName}</p>
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{holding.category}</span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getGradeColor(holding.grade)}`}>{holding.grade}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-slate-500">Qty: </span>
                        <span className="font-semibold text-slate-300">{holding.quantity.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Entry: </span>
                        <span className="font-semibold text-slate-300">{formatGP(holding.currentPrice)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Target: </span>
                        <span className="font-semibold text-green-400">{formatGP(holding.targetPrice)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Return: </span>
                        <span className="font-semibold text-green-400">+{holding.expectedReturn.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
