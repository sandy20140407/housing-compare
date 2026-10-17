import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Link2, RotateCcw } from 'lucide-react';
import { DEFAULT_INPUTS, simulate, type Inputs } from './lib/calc';
import { FREEHOLD, CPF_OA_RATE, STRESS_TEST_RATE, TDSR_LIMIT, type BuyerProfile } from './lib/rules';
import { decodeInputs, encodeInputs } from './lib/url';
import { money, pct } from './lib/format';
import { NumberField, Row, Section, Segmented, Toggle } from './components/controls';
import { NetWorthChart } from './components/NetWorthChart';

export default function App() {
  const [inp, setInp] = useState<Inputs>(() => decodeInputs(window.location.search));
  const set = <K extends keyof Inputs>(k: K) => (v: Inputs[K]) => setInp((p) => ({ ...p, [k]: v }));
  const res = useMemo(() => simulate(inp), [inp]);
  const [copied, setCopied] = useState(false);

  // 参数同步到 URL，方便分享 / 收藏
  useEffect(() => {
    const qs = encodeInputs(inp);
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [inp]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('复制这个链接：', window.location.href);
    }
  };

  const h = res.atHorizon;
  const horizon = inp.horizonYears;
  const diff = h.buyNetWorth - h.rentNetWorth;
  const freehold = inp.leaseRemaining >= FREEHOLD;
  const cashProceeds = h.netEquity - h.cpfRefundDue;
  const topYear = inp.isNewLaunch ? inp.constructionYears : null;
  const isTopSale = inp.isNewLaunch && horizon === inp.constructionYears;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold text-ink">新加坡买房 vs 租房</h1>
            <p className="text-sm text-ink-3">楼花 / 二手私宅 · 按月模拟 · 含 BSD、ABSD、SSD、CPF 应计利息</p>
          </div>
          <div className="flex gap-2">
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">
              {copied ? <Check size={15} /> : <Link2 size={15} />}
              {copied ? '已复制' : '复制分享链接'}
            </button>
            <button onClick={() => setInp(DEFAULT_INPUTS)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">
              <RotateCcw size={15} />
              重置
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr]">
        {/* ------------------------------------------------ 参数 */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          <Section title="房产">
            <div className="space-y-4">
              <NumberField label="房价" unit="SGD" value={inp.price} onChange={set('price')} min={300_000} max={8_000_000} step={50_000} />
              <Segmented
                label="类型"
                value={inp.isNewLaunch ? 'new' : 'resale'}
                options={[
                  { value: 'new', label: '新房楼花 (BUC)' },
                  { value: 'resale', label: '二手 / 现房' },
                ]}
                onChange={(v) => set('isNewLaunch')(v === 'new')}
              />
              {inp.isNewLaunch && (
                <>
                  <NumberField label="建设期（签约到 TOP）" unit="年" value={inp.constructionYears} onChange={set('constructionYears')} min={1} max={5} step={1} />
                  <Toggle label="建设期仍需租房住" checked={inp.rentWhileWaiting} onChange={set('rentWhileWaiting')} hint="自住买家通常要；纯投资可关掉" />
                </>
              )}
              <NumberField label="房价年涨幅" unit="%" value={inp.appreciation} onChange={set('appreciation')} min={-5} max={10} step={0.5} />
              <Toggle label="永久地契 (Freehold)" checked={freehold} onChange={(v) => set('leaseRemaining')(v ? FREEHOLD : 99)} />
              {!freehold && (
                <NumberField
                  label="剩余地契"
                  unit="年"
                  value={inp.leaseRemaining}
                  onChange={set('leaseRemaining')}
                  min={20}
                  max={99}
                  step={1}
                  hint={inp.leaseRemaining < 60 ? '不足 60 年：CPF 与贷款受限，衰减加速' : inp.leaseRemaining < 80 ? '中年地契，衰减开始明显' : '新地契，前十年衰减很小'}
                />
              )}
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="房产税/月" value={inp.propertyTaxMonthly} onChange={set('propertyTaxMonthly')} min={0} max={10_000} step={10} noSlider />
                <NumberField label="管理费/月" value={inp.maintenanceMonthly} onChange={set('maintenanceMonthly')} min={0} max={10_000} step={10} noSlider />
                <NumberField label="保险/月" value={inp.insuranceMonthly} onChange={set('insuranceMonthly')} min={0} max={2_000} step={5} noSlider />
              </div>
            </div>
          </Section>

          <Section title="贷款与身份">
            <div className="space-y-4">
              <NumberField label="首付比例" unit="%" value={inp.downPaymentPct} onChange={set('downPaymentPct')} min={25} max={100} step={5} hint="首套贷款 LTV 75%，首付至少 25%，其中至少 5% 现金" />
              <NumberField label="贷款利率" unit="%" value={inp.loanRate} onChange={set('loanRate')} min={0} max={8} step={0.05} />
              <NumberField label="贷款年限" unit="年" value={inp.loanYears} onChange={set('loanYears')} min={5} max={30} step={1} />
              <Segmented<BuyerProfile>
                label="买家身份"
                value={inp.buyerProfile}
                options={[
                  { value: 'SC', label: '公民 SC' },
                  { value: 'SPR', label: '永久居民 PR' },
                  { value: 'FOREIGNER', label: '外国人' },
                ]}
                onChange={set('buyerProfile')}
              />
              <Segmented<1 | 2 | 3>
                label="名下第几套住宅"
                value={inp.propertyIndex}
                options={[
                  { value: 1, label: '第 1 套' },
                  { value: 2, label: '第 2 套' },
                  { value: 3, label: '第 3 套+' },
                ]}
                onChange={set('propertyIndex')}
              />
            </div>
          </Section>

          <Section title="CPF">
            <div className="space-y-4">
              <Toggle label="用 CPF OA 付首付和月供" checked={inp.useCPF} onChange={set('useCPF')} />
              <NumberField label="OA 当前余额" unit="SGD" value={inp.cpfOABalance} onChange={set('cpfOABalance')} min={0} max={1_000_000} step={5_000} />
              <NumberField label="OA 每月缴存" unit="SGD" value={inp.cpfOAMonthly} onChange={set('cpfOAMonthly')} min={0} max={5_000} step={50} hint={`租房方案里 OA 留在账户按 ${pct(CPF_OA_RATE)} 生息；买房动用的部分卖房时要连本带息退回`} />
            </div>
          </Section>

          <Section title="租房与投资">
            <div className="space-y-4">
              <NumberField label="月租金" unit="SGD" value={inp.monthlyRent} onChange={set('monthlyRent')} min={500} max={20_000} step={100} />
              <NumberField label="租金年涨幅" unit="%" value={inp.rentIncrease} onChange={set('rentIncrease')} min={-5} max={10} step={0.5} />
              <NumberField
                label="投资年化回报"
                unit="%"
                value={inp.investmentReturn}
                onChange={set('investmentReturn')}
                min={0}
                max={15}
                step={0.5}
                hint={inp.investmentReturn <= 4 ? '保守：定存、债券、SSB' : inp.investmentReturn <= 7 ? '稳健：宽基指数、REITs' : inp.investmentReturn <= 10 ? '进取：股票为主，波动大' : '激进：长期很难稳定做到'}
              />
            </div>
          </Section>

          <Section
            title="卖出与比较期"
            aside={
              inp.isNewLaunch && !isTopSale ? (
                <button onClick={() => set('horizonYears')(inp.constructionYears)} className="text-xs text-accent hover:underline">
                  设为 TOP 时卖出
                </button>
              ) : undefined
            }
          >
            <div className="space-y-4">
              <NumberField label="持有 / 比较年限" unit="年" value={inp.horizonYears} onChange={set('horizonYears')} min={1} max={30} step={1} hint="视为满 N 年后卖出；SSD 按此计算" />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="卖房中介费" unit="%" value={inp.agentFeePct} onChange={set('agentFeePct')} min={0} max={5} step={0.5} noSlider />
                <NumberField label="卖房律师费" value={inp.sellLegalFee} onChange={set('sellLegalFee')} min={0} max={20_000} step={500} noSlider />
              </div>
              <NumberField label="买房律师费" value={inp.buyLegalFee} onChange={set('buyLegalFee')} min={0} max={20_000} step={500} noSlider />
            </div>
          </Section>

          <Section title="TDSR 检查（可选）">
            <div className="space-y-4">
              <NumberField label="税前月收入" unit="SGD" value={inp.monthlyIncome} onChange={set('monthlyIncome')} min={0} max={100_000} step={500} noSlider hint="填 0 跳过" />
              <NumberField label="其他月还款（车贷等）" unit="SGD" value={inp.otherDebtMonthly} onChange={set('otherDebtMonthly')} min={0} max={50_000} step={100} noSlider />
            </div>
          </Section>
        </aside>

        {/* ------------------------------------------------ 结果 */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="text-sm text-ink-3">
              第 {horizon} 年末全部变现后的净资产{isTopSale && '（TOP 时卖出）'}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-buy-soft p-4">
                <div className="text-sm text-buy">买房</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{money(h.buyNetWorth)}</div>
              </div>
              <div className="rounded-lg bg-rent-soft p-4">
                <div className="text-sm text-rent">租房 + 投资</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{money(h.rentNetWorth)}</div>
              </div>
              <div className="rounded-lg border border-line p-4">
                <div className="text-sm text-ink-3">差额（买 − 租）</div>
                <div className={`mt-1 text-2xl font-semibold tabular-nums ${diff >= 0 ? 'text-buy' : 'text-rent'}`}>
                  {diff >= 0 ? '+' : ''}
                  {money(diff)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-2">
              {diff >= 0 ? '买房在这个期限内更划算。' : '租房并把省下的钱拿去投资更划算。'}
              {res.crossoverYear !== null
                ? ` 买房从第 ${res.crossoverYear} 年起反超。`
                : diff < 0
                  ? ` ${horizon} 年内买房都没有反超。`
                  : ''}
            </p>
            {res.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                {res.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Section title="净资产走势（每年末按变现计）">
            <NetWorthChart series={res.series} horizon={horizon} topYear={topYear} />
            <p className="mt-2 text-xs text-ink-3">前几年买房曲线偏低，主要是 BSD / ABSD、SSD 和卖房成本，持有越久摊得越薄。</p>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title={`第 ${horizon} 年卖出明细`}>
              <Row label="房产市值" value={money(h.propertyValue)} />
              {!freehold && <Row sub label={`含地契衰减（剩 ${inp.leaseRemaining - horizon} 年）`} value="" />}
              <Row label="− 剩余贷款" value={money(h.loanBalance)} />
              {h.unpaidToDeveloper > 0 && <Row label="− 未付开发商进度款（由下家承接）" value={money(h.unpaidToDeveloper)} />}
              <Row label={`− 中介费 + 律师费`} value={money(h.sellingCosts)} />
              <Row label="− SSD" value={money(h.ssd)} tone={h.ssd > 0 ? 'neg' : undefined} />
              <Row strong label="房产净值" value={money(h.netEquity)} />
              {inp.useCPF && (
                <>
                  <Row sub label="其中退回 CPF OA（本金 + 应计利息）" value={money(h.cpfRefundDue)} />
                  <Row sub label="到手现金" value={money(cashProceeds)} tone={cashProceeds < 0 ? 'neg' : undefined} />
                </>
              )}
              <Row label="+ 买房方的投资账户" value={money(h.buyPortfolio)} />
              {inp.useCPF && <Row label="+ 买房方 CPF OA" value={money(h.buyOA)} />}
              <Row strong label="买房总净资产" value={money(h.buyNetWorth)} />
              <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
                <Row
                  label="纯房产投资年化 IRR"
                  value={res.propertyIrr === null ? '—' : pct(res.propertyIrr)}
                  tone={res.propertyIrr !== null && res.propertyIrr < 0 ? 'neg' : 'pos'}
                />
                <p className="text-xs text-ink-3">只算投进房子的钱（首付、税费、月供、持有成本）和卖房净回款，不计省下的租金。和投资回报 {inp.investmentReturn}% 对比，可以看出纯投资角度值不值。</p>
              </div>
            </Section>

            <Section title={`租房方案（第 ${horizon} 年）`}>
              <Row label="累计房租" value={money(h.cumRentOutflow)} />
              <Row label="投资账户" value={money(h.rentPortfolio)} />
              <Row sub label="首付、税费和每月省下的钱都投进去" value="" />
              <Row label="CPF OA 余额" value={money(h.rentOA)} />
              <Row strong label="租房总净资产" value={money(h.rentNetWorth)} />
              <div className="mt-4 border-t border-line pt-3">
                <Row label="买房方累计投入（现金 + CPF）" value={money(h.cumBuyOutflow)} />
                <Row sub label="其中已付利息" value={money(h.cumInterest)} />
              </div>
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="每月支出（交房后）">
              <Row label="月供" value={money(res.monthly.installment)} />
              {inp.useCPF && (
                <>
                  <Row sub label="CPF OA 支付" value={money(res.monthly.fromCpf)} />
                  <Row sub label="现金支付" value={money(res.monthly.fromCash)} />
                </>
              )}
              <Row label="房产税" value={money(res.monthly.propertyTax)} />
              <Row label="管理费" value={money(res.monthly.maintenance)} />
              <Row label="保险" value={money(res.monthly.insurance)} />
              <Row strong label="买房合计" value={money(res.monthly.total)} />
              {inp.useCPF && <Row label="其中现金" value={money(res.monthly.cashTotal)} />}
              <Row strong label="租房（首年月租）" value={money(inp.monthlyRent)} />
              {inp.isNewLaunch && (
                <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
                  建设期按进度款逐步放贷，平均月供约 {money(res.constructionAvgInstallment)}（本金 + 利息，不是零）
                  {inp.rentWhileWaiting && `，同时还要付房租 ${money(inp.monthlyRent)} 起`}。
                </p>
              )}
              {res.tdsr && (
                <div className="mt-3 rounded-lg border border-line p-3 text-sm">
                  <Row
                    label={`TDSR（按 ${pct(Math.max(inp.loanRate / 100, STRESS_TEST_RATE), 1)} 压力利率）`}
                    value={pct(res.tdsr.ratio)}
                    tone={res.tdsr.ratio > TDSR_LIMIT ? 'neg' : 'pos'}
                  />
                  <Row sub label="压力测试月供" value={money(res.tdsr.stressInstallment)} />
                </div>
              )}
            </Section>

            <Section title="首期与付款节点">
              <Row label="BSD 买方印花税（分级）" value={money(res.bsd)} />
              <Row label={`ABSD（${inp.buyerProfile === 'SC' ? '公民' : inp.buyerProfile === 'SPR' ? 'PR' : '外国人'}第 ${inp.propertyIndex} 套）`} value={money(res.absd)} tone={res.absd > 0 ? 'neg' : undefined} />
              <Row label="贷款额" value={money(res.loanAmount)} />
              <Row strong label="签约时现金" value={money(res.upfrontCash)} />
              {res.upfrontCpf > 0 && <Row label="签约时 CPF" value={money(res.upfrontCpf)} />}
              {inp.isNewLaunch && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-ink-3">
                        <th className="py-1.5 font-normal">节点</th>
                        <th className="py-1.5 text-right font-normal">月</th>
                        <th className="py-1.5 text-right font-normal">现金</th>
                        <th className="py-1.5 text-right font-normal">CPF</th>
                        <th className="py-1.5 text-right font-normal">贷款</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums text-ink-2">
                      {res.stages.map((s) => (
                        <tr key={s.name} className="border-b border-line/60">
                          <td className="py-1.5">{s.name}</td>
                          <td className="py-1.5 text-right">{s.month}</td>
                          <td className="py-1.5 text-right">{s.fromCash ? money(s.fromCash) : '—'}</td>
                          <td className="py-1.5 text-right">{s.fromCpf ? money(s.fromCpf) : '—'}</td>
                          <td className="py-1.5 text-right">{s.fromLoan ? money(s.fromLoan) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-ink-3">节点时间按建设期均匀估计，实际看工程进度；CSC 一般在 TOP 后约一年。</p>
                </div>
              )}
            </Section>
          </div>

          <Section title="计算口径">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
              <li>两个方案每月总预算相同，支出少的一方把差额按投资回报率投资；签约时的首付和税费在租房方案里全部拿去投资。</li>
              <li>BSD 按住宅分级税率；ABSD 按 2023-04-27 起税率；SSD 按 2025-07-04 起的 4 年持有期（16 / 12 / 8 / 4%），楼花从签约起算，不是从 TOP 起算。</li>
              <li>BSD、ABSD 和律师费按现金支付（BSD 实际可用 CPF 报销，这里保守处理）。</li>
              <li>CPF 应计利息按 OA 利率 {pct(CPF_OA_RATE)} 复利；卖房时退回 OA，不影响总净资产，但影响到手现金。</li>
              <li>地契衰减按 Bala's Table 形状的近似曲线，只是估算。</li>
              <li>没算的：装修、租房中介费 / 押金、出租收入、利率变动、交易摩擦外的市场风险。</li>
            </ul>
            <p className="mt-3 text-xs text-ink-3">仅供参考，不构成财务或法律建议。政策核对日期：2026-10。</p>
          </Section>
        </div>
      </main>
    </div>
  );
}
