import React, { useState } from 'react';
import { Home, TrendingUp, Calculator } from 'lucide-react';

export default function PropertyComparison() {
  // 买房参数
  const [propertyPrice, setPropertyPrice] = useState(2000000);
  const [downPayment, setDownPayment] = useState(25);
  const [loanRate, setLoanRate] = useState(4.0);
  const [loanYears, setLoanYears] = useState(30);
  const [propertyTax, setPropertyTax] = useState(250);
  const [maintenance, setMaintenance] = useState(350);
  const [insurance, setInsurance] = useState(25);
  const [appreciation, setAppreciation] = useState(2.5);
  const [leaseRemaining, setLeaseRemaining] = useState(99);
  
  // 新房/现房选项
  const [isNewLaunch, setIsNewLaunch] = useState(true);
  const [constructionYears, setConstructionYears] = useState(3);
  const [sellAtTOP, setSellAtTOP] = useState(false);
  const [topAppreciation, setTopAppreciation] = useState(10);
  
  // CPF参数
  const [useCPF, setUseCPF] = useState(true);
  const [cpfOAMonthly, setCpfOAMonthly] = useState(1000);
  
  // 租房参数
  const [monthlyRent, setMonthlyRent] = useState(4000);
  const [rentIncrease, setRentIncrease] = useState(3);
  
  // 投资参数
  const [investmentReturn, setInvestmentReturn] = useState(5);

  // 计算买房成本
  const loanAmount = propertyPrice * (1 - downPayment / 100);
  const monthlyRate = loanRate / 100 / 12;
  const numPayments = loanYears * 12;
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // 新房建设期的利息计算（简化）
  const constructionInterest = isNewLaunch ? (loanAmount * 0.5 * (loanRate / 100) * constructionYears) : 0;
  
  // CPF支付部分
  const cpfPayment = useCPF ? Math.min(cpfOAMonthly, monthlyMortgage) : 0;
  const cashMortgage = monthlyMortgage - cpfPayment;
  
  const buyMonthlyTotal = monthlyMortgage + propertyTax + maintenance + insurance;
  const buyCashOutlay = cashMortgage + propertyTax + maintenance + insurance;
  const buyYearlyTotal = buyMonthlyTotal * 12;
  const buyCashYearly = buyCashOutlay * 12;
  
  const initialCash = propertyPrice * (downPayment / 100);
  const stampDuty = propertyPrice * 0.04; // 简化计算
  const totalInitialCost = initialCash + stampDuty;
  
  // TOP卖出的收益计算
  const calculateTOPSale = () => {
    const sellingPrice = propertyPrice * (1 + topAppreciation / 100);
    const sellerStampDuty = 0; // TOP时卖出，持有刚满3年，无SSD（假设）
    const agentFee = sellingPrice * 0.02; // 中介费2%
    const legalFee = 3000;
    
    // 建设期只付工程进度款的利息，远低于全额月供
    // 简化计算：平均已付50%款项，按此计算利息
    const avgLoanDuringConstruction = loanAmount * 0.5;
    const constructionInterest = avgLoanDuringConstruction * (loanRate / 100) * constructionYears;
    
    // 建设期无需付房产税、管理费、保险（房子还没建好）
    const constructionPeriodCosts = constructionInterest;
    
    const totalCost = initialCash + stampDuty + constructionPeriodCosts + sellerStampDuty + agentFee + legalFee;
    const grossProfit = sellingPrice - propertyPrice; // 房价增值
    const netProceeds = sellingPrice - totalCost; // 扣除所有成本后的净收益
    const roi = (netProceeds / (initialCash + stampDuty + constructionPeriodCosts)) * 100;
    const annualizedROI = roi / constructionYears;
    
    return {
      sellingPrice,
      totalCost,
      grossProfit,
      netProceeds,
      roi,
      annualizedROI,
      constructionInterest,
      sellerStampDuty,
      agentFee,
      constructionPeriodCosts,
      avgLoanDuringConstruction
    };
  };
  
  const topSale = sellAtTOP ? calculateTOPSale() : null;
  
  // 计算租房成本
  const rentYearlyTotal = monthlyRent * 12;
  
  // 10年对比
  const calculateTenYearComparison = () => {
    let buyTotalCost = totalInitialCost;
    let rentTotalCost = 0;
    let currentRent = monthlyRent;
    let investmentValue = initialCash;
    
    // 如果是新房，前几年建设期的成本计算不同
    const yearsAfterConstruction = Math.max(0, 10 - constructionYears);
    
    for (let year = 1; year <= 10; year++) {
      if (isNewLaunch && year <= constructionYears) {
        // 建设期：只付工程进度款的少量利息，简化为0
        buyTotalCost += 0;
      } else {
        // 交房后：正常月供
        buyTotalCost += buyYearlyTotal;
      }
      
      rentTotalCost += currentRent * 12;
      
      // 租房方案：首付+月度差额都用于投资
      if (isNewLaunch && year <= constructionYears) {
        // 建设期买房几乎无月供，租房的月度投资更多
        investmentValue = investmentValue * (1 + investmentReturn / 100) + (monthlyRent) * 12;
      } else {
        investmentValue = investmentValue * (1 + investmentReturn / 100) + Math.max(0, buyMonthlyTotal - currentRent) * 12;
      }
      
      currentRent = currentRent * (1 + rentIncrease / 100);
    }
    
    // 计算地契贬值影响
    const leaseAfter10Y = leaseRemaining - 10;
    let leaseDecayFactor = 1.0;
    
    if (leaseAfter10Y > 70) {
      leaseDecayFactor = 1.0;
    } else if (leaseAfter10Y > 60) {
      leaseDecayFactor = 0.95;
    } else if (leaseAfter10Y > 50) {
      leaseDecayFactor = 0.90;
    } else if (leaseAfter10Y > 40) {
      leaseDecayFactor = 0.82;
    } else if (leaseAfter10Y > 30) {
      leaseDecayFactor = 0.70;
    } else if (leaseAfter10Y > 20) {
      leaseDecayFactor = 0.55;
    } else {
      leaseDecayFactor = 0.40;
    }
    
    const propertyValue10Y = propertyPrice * Math.pow(1 + appreciation / 100, 10) * leaseDecayFactor;
    const remainingLoan10Y = calculateRemainingLoan(10 - (isNewLaunch ? constructionYears : 0));
    const netWorthBuying = propertyValue10Y - remainingLoan10Y;
    const netWorthRenting = investmentValue;
    
    return {
      buyTotalCost,
      rentTotalCost,
      netWorthBuying,
      netWorthRenting,
      propertyValue10Y,
      leaseAfter10Y,
      leaseDecayFactor
    };
  };
  
  const calculateRemainingLoan = (years) => {
    const paymentsLeft = numPayments - (years * 12);
    if (paymentsLeft <= 0) return 0;
    return loanAmount * (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, years * 12)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  };
  
  const tenYearData = calculateTenYearComparison();

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏠 新加坡买房 vs 租房对比</h1>
          <p className="text-gray-600">全面分析您的最佳选择</p>
        </div>

        {/* 参数输入区域 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 买房参数 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Home className="text-blue-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">买房参数</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  房产总价 (SGD): {formatCurrency(propertyPrice)}
                </label>
                <input
                  type="range"
                  min="500000"
                  max="5000000"
                  step="100000"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">新房期房（楼花）</label>
                  <input
                    type="checkbox"
                    checked={isNewLaunch}
                    onChange={(e) => setIsNewLaunch(e.target.checked)}
                    className="w-5 h-5"
                  />
                </div>
                {isNewLaunch && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">建设期（年）</label>
                      <input
                        type="range"
                        min="2"
                        max="5"
                        step="1"
                        value={constructionYears}
                        onChange={(e) => setConstructionYears(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-600 mt-1">
                        {constructionYears}年建设期
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">TOP后立即卖出（炒楼花）</label>
                        <input
                          type="checkbox"
                          checked={sellAtTOP}
                          onChange={(e) => setSellAtTOP(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      {sellAtTOP && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            预期涨幅（建设期{constructionYears}年）: {topAppreciation}%
                          </label>
                          <input
                            type="range"
                            min="-10"
                            max="30"
                            step="1"
                            value={topAppreciation}
                            onChange={(e) => setTopAppreciation(Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            年化: {(topAppreciation / constructionYears).toFixed(1)}%/年
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  首付比例: {downPayment}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="5"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  贷款利率: {loanRate}%
                </label>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.1"
                  value={loanRate}
                  onChange={(e) => setLoanRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  贷款年限: {loanYears}年
                </label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={loanYears}
                  onChange={(e) => setLoanYears(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">房产税/月</label>
                  <input
                    type="number"
                    value={propertyTax}
                    onChange={(e) => setPropertyTax(Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">维护费/月</label>
                  <input
                    type="number"
                    value={maintenance}
                    onChange={(e) => setMaintenance(Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">保险/月</label>
                  <input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  房产年升值率: {appreciation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={appreciation}
                  onChange={(e) => setAppreciation(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  剩余地契年限: {leaseRemaining}年
                </label>
                <input
                  type="range"
                  min="20"
                  max="99"
                  step="1"
                  value={leaseRemaining}
                  onChange={(e) => setLeaseRemaining(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {leaseRemaining > 80 && "✅ 新公寓，贬值影响小"}
                  {leaseRemaining >= 60 && leaseRemaining <= 80 && "⚠️ 中古公寓，需注意贬值"}
                  {leaseRemaining < 60 && "❌ 老公寓，贬值加速，难贷款"}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">使用CPF OA支付房贷</label>
                  <input
                    type="checkbox"
                    checked={useCPF}
                    onChange={(e) => setUseCPF(e.target.checked)}
                    className="w-5 h-5"
                  />
                </div>
                {useCPF && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">CPF OA月缴存 (SGD)</label>
                    <input
                      type="number"
                      value={cpfOAMonthly}
                      onChange={(e) => setCpfOAMonthly(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 租房参数 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="text-green-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">租房参数</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  月租金 (SGD): {formatCurrency(monthlyRent)}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  租金年增长率: {rentIncrease}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={rentIncrease}
                  onChange={(e) => setRentIncrease(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  投资回报率: {investmentReturn}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={investmentReturn}
                  onChange={(e) => setInvestmentReturn(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  (将买房的首付款用于投资的预期年回报)
                </p>
                <div className="text-xs mt-1">
                  {investmentReturn <= 5 && "💼 保守型：债券、定存"}
                  {investmentReturn > 5 && investmentReturn <= 8 && "📈 稳健型：指数基金、REITs"}
                  {investmentReturn > 8 && investmentReturn <= 12 && "🚀 进取型：股票、成长股"}
                  {investmentReturn > 12 && "⚡ 激进型：需要专业投资能力"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 月度对比 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <Calculator className="text-purple-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">每月成本对比</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 text-gray-700">项目</th>
                  <th className="text-right py-3 px-4 text-blue-700">买房</th>
                  <th className="text-right py-3 px-4 text-green-700">租房</th>
                  <th className="text-right py-3 px-4 text-purple-700">差额</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">房贷（总额）</td>
                  <td className="text-right py-3 px-4">{formatCurrency(monthlyMortgage)}</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
                {useCPF && cpfPayment > 0 && (
                  <>
                    <tr className="border-b bg-blue-50">
                      <td className="py-3 px-4 pl-8 text-sm">└ CPF OA支付</td>
                      <td className="text-right py-3 px-4 text-blue-600">({formatCurrency(cpfPayment)})</td>
                      <td className="text-right py-3 px-4">-</td>
                      <td className="text-right py-3 px-4">-</td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="py-3 px-4 pl-8 text-sm">└ 现金支付</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(cashMortgage)}</td>
                      <td className="text-right py-3 px-4">-</td>
                      <td className="text-right py-3 px-4">-</td>
                    </tr>
                  </>
                )}
                <tr className="border-b">
                  <td className="py-3 px-4">租金</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">{formatCurrency(monthlyRent)}</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">房产税</td>
                  <td className="text-right py-3 px-4">{formatCurrency(propertyTax)}</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">维护费/管理费</td>
                  <td className="text-right py-3 px-4">{formatCurrency(maintenance)}</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">保险</td>
                  <td className="text-right py-3 px-4">{formatCurrency(insurance)}</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
                <tr className="border-b-2 border-gray-300 font-bold bg-gray-50">
                  <td className="py-3 px-4">每月总计（含CPF）</td>
                  <td className="text-right py-3 px-4 text-blue-700">{formatCurrency(buyMonthlyTotal)}</td>
                  <td className="text-right py-3 px-4 text-green-700">{formatCurrency(monthlyRent)}</td>
                  <td className="text-right py-3 px-4 text-purple-700">{formatCurrency(buyMonthlyTotal - monthlyRent)}</td>
                </tr>
                {useCPF && (
                  <tr className="font-bold bg-blue-50">
                    <td className="py-3 px-4">每月现金支出</td>
                    <td className="text-right py-3 px-4 text-blue-700">{formatCurrency(buyCashOutlay)}</td>
                    <td className="text-right py-3 px-4 text-green-700">{formatCurrency(monthlyRent)}</td>
                    <td className="text-right py-3 px-4 text-purple-700">{formatCurrency(buyCashOutlay - monthlyRent)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 年度对比 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">每年成本对比</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">买房年度总支出</div>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(buyYearlyTotal)}</div>
              {useCPF && (
                <div className="text-xs text-gray-600 mt-1">现金: {formatCurrency(buyCashYearly)}</div>
              )}
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">租房年度总支出</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(rentYearlyTotal)}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">年度差额</div>
              <div className="text-2xl font-bold text-purple-700">{formatCurrency(buyYearlyTotal - rentYearlyTotal)}</div>
            </div>
          </div>
        </div>

        {/* 初始成本 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {sellAtTOP ? "TOP卖出投资收益分析" : `初始成本 ${isNewLaunch ? "（新房期房）" : ""}`}
          </h2>
          
          {sellAtTOP && topSale ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">售价（{constructionYears}年后）</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(topSale.sellingPrice)}</div>
                  <div className="text-xs text-gray-600 mt-1">涨幅: {topAppreciation}%</div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">总成本</div>
                  <div className="text-2xl font-bold text-red-700">{formatCurrency(topSale.totalCost)}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3">成本明细：</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>首付款（{downPayment}%）</span>
                    <span className="font-semibold">{formatCurrency(initialCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>买家印花税（BSD 4%）</span>
                    <span className="font-semibold">{formatCurrency(stampDuty)}</span>
                  </div>
                  <div className="flex justify-between bg-blue-50 px-2 py-1 rounded">
                    <span>建设期利息（{constructionYears}年）</span>
                    <span className="font-semibold">{formatCurrency(topSale.constructionInterest)}</span>
                  </div>
                  <div className="text-xs text-gray-600 ml-4 -mt-1 mb-2">
                    └ 仅支付进度款利息，远低于全额月供
                  </div>
                  <div className="flex justify-between">
                    <span>中介费（2%）</span>
                    <span className="font-semibold">{formatCurrency(topSale.agentFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>律师费</span>
                    <span className="font-semibold">{formatCurrency(3000)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>✅ 卖家印花税（SSD）</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="text-xs text-gray-600 ml-4 -mt-1">
                    └ TOP时刚好满3年，无需缴纳
                  </div>
                  <div className="text-xs text-gray-600 bg-green-50 px-2 py-2 rounded mt-2">
                    💡 建设期无需支付：房产税、管理费、保险、正常月供
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-800 font-bold">净收益</span>
                    <span className={`text-3xl font-bold ${topSale.netProceeds > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(topSale.netProceeds)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <span className="text-gray-600">总回报率:</span>
                      <span className={`ml-2 font-semibold ${topSale.roi > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {topSale.roi.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">年化回报:</span>
                      <span className={`ml-2 font-semibold ${topSale.annualizedROI > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {topSale.annualizedROI.toFixed(1)}%/年
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                <div className="font-semibold text-gray-800 mb-2">⚠️ 重要风险提示：</div>
                <ul className="space-y-1 ml-4 list-disc text-gray-700">
                  <li><strong>ABSD（额外买家印花税）</strong>：PR第二套+30%，外国人+60% - 这是最大成本！</li>
                  <li><strong>市场风险</strong>：3年后房价可能低于购买价</li>
                  <li><strong>流动性风险</strong>：TOP时可能难以找到买家</li>
                  <li><strong>利率风险</strong>：建设期利率上升会增加成本</li>
                  <li><strong>开发商延期风险</strong>：TOP延期会增加持有成本</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs mt-3">
                <div className="font-semibold text-gray-800 mb-2">💡 炒楼花的真实优势：</div>
                <ul className="space-y-1 ml-4 list-disc text-gray-700">
                  <li>建设期（{constructionYears}年）<strong>零月供压力</strong></li>
                  <li>只需支付少量进度款利息</li>
                  <li>无需支付房产税、管理费、保险</li>
                  <li>用极少的现金流撬动整个投资</li>
                  <li>如果市场好，可以实现高杠杆收益</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">首付款 ({downPayment}%)</span>
                <span className="font-semibold">{formatCurrency(initialCash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">印花税（BSD，约4%）</span>
                <span className="font-semibold">{formatCurrency(stampDuty)}</span>
              </div>
              {isNewLaunch && (
                <div className="p-3 bg-blue-50 rounded mt-3">
                  <div className="text-sm text-gray-700 mb-2">
                    <strong>💡 新房优势：</strong>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                    <li>建设期（{constructionYears}年）月供压力极小</li>
                    <li>可分期支付进度款，现金流友好</li>
                    <li>只付已支付部分的利息（很少）</li>
                    <li>有时间准备CPF OA余额</li>
                  </ul>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                <span className="text-gray-800 font-bold">Day 1总初始投入</span>
                <span className="font-bold text-xl text-blue-700">{formatCurrency(totalInitialCost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 10年对比 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">10年长期对比</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-blue-700 mb-3">买房情况 {isNewLaunch && "（新房）"}</h3>
              <div className="space-y-2 text-sm">
                {isNewLaunch && (
                  <div className="p-2 bg-blue-50 rounded text-xs mb-2">
                    前{constructionYears}年建设期月供极少，第{constructionYears + 1}年起开始正常月供
                  </div>
                )}
                <div className="flex justify-between">
                  <span>10年累计支出</span>
                  <span className="font-semibold">{formatCurrency(tenYearData.buyTotalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>房产市值（10年后）</span>
                  <span className="font-semibold">{formatCurrency(tenYearData.propertyValue10Y)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>└ 剩余地契：{tenYearData.leaseAfter10Y}年</span>
                  <span>地契贬值影响：{((1 - tenYearData.leaseDecayFactor) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>剩余贷款</span>
                  <span className="font-semibold">{formatCurrency(calculateRemainingLoan(10 - (isNewLaunch ? constructionYears : 0)))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-blue-700">
                  <span>净资产</span>
                  <span>{formatCurrency(tenYearData.netWorthBuying)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-green-700 mb-3">租房情况</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>10年累计支出</span>
                  <span className="font-semibold">{formatCurrency(tenYearData.rentTotalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>投资资产（首付款投资）</span>
                  <span className="font-semibold">{formatCurrency(tenYearData.netWorthRenting)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-green-700">
                  <span>净资产</span>
                  <span>{formatCurrency(tenYearData.netWorthRenting)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-800">10年净资产差额（买房-租房）</span>
              <span className={`text-2xl font-bold ${tenYearData.netWorthBuying - tenYearData.netWorthRenting > 0 ? 'text-blue-700' : 'text-green-700'}`}>
                {formatCurrency(tenYearData.netWorthBuying - tenYearData.netWorthRenting)}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {tenYearData.netWorthBuying > tenYearData.netWorthRenting 
                ? "💼 买房在10年后净资产更高" 
                : "🚀 租房+投资在10年后净资产更高"}
            </div>
            {investmentReturn >= 10 && tenYearData.netWorthRenting > tenYearData.netWorthBuying && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>⚠️ 高回报提醒：</strong> {investmentReturn}%的年化回报需要：
                <ul className="mt-1 ml-4 list-disc">
                  <li>专业投资知识和经验</li>
                  <li>承受较高波动风险</li>
                  <li>长期纪律性执行</li>
                  <li>过往收益不代表未来表现</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>* 此计算仅供参考，实际情况可能因个人财务状况、市场变化等因素而异</p>
        </div>
      </div>
    </div>
  );
}