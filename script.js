// ============================================================
// ▼▼▼ 設定區：請填入您的 GAS 部署網址 ▼▼▼
// ============================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbx_HP26PxVSXpqc5Ap_C3MiOPv76uzvaJYcRe3OghOtGKXjL1JHT6a7Cw6Vnd_4l9KojA/exec";
// ============================================================

// ── EPA 等級文字描述 ──
var EPA_DESC = { 1:'僅供觀察', 2:'主動監督', 3:'反應性監督', 4:'獨立執行', 5:'可指導他人' };

// ── 預設評語對照表（與評估表單一致，用於歸類「其他/修改」項目）──
var predefinedTexts = {
    "病史收集":  ["病史收集不完整，需要更詳細詢問相關症狀","需要加強詢問過去病史與用藥史","應詢問症狀發生的時間序列與誘發因子","如果有擔心的疾病，可重點針其併發的症狀做詢問","在病人出現危急狀況時，需要以快速、重點的方式來取得資訊"],
    "理學檢查":  ["呼吸道評估不完整，醒著病人可請其咳嗽評估","體液評估不足(水腫等)","如擔心貧血，可以直接看conjunctiva","生命徵象監測與評估需要更積極","擔心酸鹼問題，可以注意是否有kussmaul breathing"],
    "處置與治療":["急性病人處置反應過慢，需要更迅速行動","氧氣治療策略可更靈活，可先給予高濃度氧氣(如VM 50%或NRM)，再依反應逐步下調","對於COPD急性惡化病人，當呼吸費力或低血氧時，不應固守SpO2 88-92%的目標，仍需優先矯正低血氧","升階抗生素不急迫，會浪費人力資源","給氧氣後仍需等待一段時間才會有反應"],
    "檢驗檢查":  ["抽血項目應對應可能的診斷，對於低血氧的病人，最重要的是ABG","ABG的判讀(PaO2, PaCO2, PF ratio)需要加強","檢查的判讀還需與臨床做結合，才能綜合判斷","檢查結果解讀不完整","CXR可以跟之前的做比較"],
    "交班報告":  ["交班需要包含基本的資訊(如：病人基本資料、過去病史、目前狀況、治療計畫)","應學習整合資訊並講出評估結果(如：PNA in progression或Fluid overload)","交班結構可再加強，應包含評估、處置、反應、鑑別診斷與下一步計畫","交班內容組織不佳，缺乏邏輯性","交班缺乏臨床思維，僅報告數據"],
    "插管前準備":["備物流程不夠熟練，應在開始前將所有器械(Endo, Blade, EtCO2等)準備齊全","器材規格與名稱需更熟悉(如Endo size：男7.5-8, 女7-7.5; Laryngoscope blade 3或4號)","Pre-oxygenation不確實，應使用NRM或BVM給予純氧至少2-3分鐘","擺位不當，忘記備中單等細節","使用BVM時未注意密合度，應練習正確的CE手勢或是雙人操作以防止漏氣","使用BVM時，如清醒病人可以自主呼吸，直接使用面罩罩住給予氧氣；如果直接bagging會造成病人不適"],
    "藥物給予":  ["插管前未確認血壓","藥物劑量不熟悉，需熟記常用藥物劑量(如Propofol 1mg/kg, Dormicum 0.1-0.3mg/kg)","肌肉鬆弛劑劑量需熟記(如Succinylcholine 1.5mg/kg, Rocuronium 1mg/kg)","給藥前未確認病人體重，影響劑量準確性","備藥與給藥不同，下達醫囑時須包含\"藥物\"、\"劑量\"、\"途徑\"、\"頻次\"","常要給予Challenge fluid (如NS 500ml) 時機不當，應有休克或體液不足等證據支持"],
    "插管技術":  ["Blade放置過深，應貼著舌頭根本處以利掀起會厭，避免佔據氣管內管置入空間","插管中若血氧下降，應立即暫停並確實使用BVM給氧","插管技巧需要更多練習","手握Endo的位置過低，會使插管過程中斷","插管時間過長，動作不夠流暢"],
    "插管後評估":["插管後未立即監測生命徵象(特別是因正壓通氣及藥物影響下的血壓)","End-tidal CO2監測與判讀不熟(使用波形確認位置)","未安排或忘記追蹤CXR，以確認氣管內管深度(Carina上2-3cm)與併發症","可以先使用聽診確定是否有one lung intubation的問題","可以在建立呼吸道後適時重新追蹤ABG","回到疾病本身，針對導致插管的疾病做處理(如調整抗生素)"]
};

var respCategories  = ["病史收集","理學檢查","處置與治療","檢驗檢查","交班報告"];
var intubCategories = ["插管前準備","藥物給予","插管技術","插管後評估"];

// ── 資料容器初始化 ──
var parsedDifficulties = {};
Object.keys(predefinedTexts).forEach(function(cat) {
    parsedDifficulties[cat] = { total: 0, specifics: {}, others: [] };
    predefinedTexts[cat].forEach(function(text) {
        parsedDifficulties[cat].specifics[text] = 0;
    });
});

var currentModalChart = null;

// ============================================================
// JSONP 資料載入
// ──────────────────────────────────────────────────────────
// 原因說明：瀏覽器對 fetch() 跨域 GET 的 CORS 規則，
// 會在 GAS 回應時因缺少 Access-Control-Allow-Origin header 而報錯，
// 且 GAS 無法自訂該 header。
//
// 解法：改用 JSONP（動態 <script> 注入），瀏覽器不對 script src 施加 CORS 檢查。
// GAS 端的 doGet() 會偵測 ?callback=xxx 並回傳 xxx(json);
//
// 重要 Bug 修正（前版錯誤）：
//   前版在 fetchDataViaJSONP() 中對 window[callbackName] 先賦值再覆寫，
//   導致 origCallback 指向被覆寫後的版本，觸發無限遞迴，callback 永遠不執行。
//   本版改為：只建立一個 window[callbackName]，內部統一處理 clearTimeout + 清理 + 呼叫。
// ============================================================
function fetchDataViaJSONP(url, onSuccess, onError) {
    // 用時間戳確保每次 callback 名稱唯一，避免快取衝突
    var cbName = 'pgyDashCb_' + Date.now();

    var timeoutId = setTimeout(function() {
        // 超時清理
        if (window[cbName]) delete window[cbName];
        var el = document.getElementById('jsonp_' + cbName);
        if (el) el.remove();
        if (onError) onError(new Error('JSONP request timed out after 12 seconds'));
    }, 12000);

    // 一次性定義 callback，內部 clearTimeout 後自行清理
    window[cbName] = function(data) {
        clearTimeout(timeoutId);
        delete window[cbName];
        var el = document.getElementById('jsonp_' + cbName);
        if (el) el.remove();
        onSuccess(data);
    };

    var script = document.createElement('script');
    script.id  = 'jsonp_' + cbName;
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cbName;
    script.onerror = function() {
        clearTimeout(timeoutId);
        delete window[cbName];
        script.remove();
        if (onError) onError(new Error('JSONP script load error'));
    };

    document.body.appendChild(script);
}

// ── 主入口 ──
document.addEventListener('DOMContentLoaded', function() {
    fetchDataViaJSONP(
        GAS_URL,
        function(data) { processData(data); },
        function(err) {
            console.error('[Dashboard] 資料載入失敗:', err);
            showError(err.message);
        }
    );
});

// ── 錯誤狀態顯示 ──
function showError(msg) {
    ['total-count','avg-resp-epa','avg-intub-epa','top-issue-cat'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    var list = document.getElementById('top5List');
    if (list) list.innerHTML = '<div class="error-state">資料載入失敗。請確認 GAS 已重新部署為新版本，且部署網址正確。<br><br>錯誤詳情：' + escapeHtml(msg) + '</div>';
}

// ── 資料處理 ──
function processData(data) {
    // ── KPI ──
    document.getElementById('total-count').textContent = data.totalEvaluations + ' 份';

    var avgResp  = data.avgRespEpa  || 0;
    var avgIntub = data.avgIntubEpa || 0;
    document.getElementById('avg-resp-epa').textContent  = avgResp  > 0 ? avgResp.toFixed(1)  : '—';
    document.getElementById('avg-intub-epa').textContent = avgIntub > 0 ? avgIntub.toFixed(1) : '—';
    document.getElementById('resp-epa-desc').textContent  = avgResp  > 0 ? '約為：' + (EPA_DESC[Math.round(avgResp)]  || '—') : '尚無資料';
    document.getElementById('intub-epa-desc').textContent = avgIntub > 0 ? '約為：' + (EPA_DESC[Math.round(avgIntub)] || '—') : '尚無資料';

    // ── 解析待改進項目（含模糊比對）──
    // 問題說明：
    //   評估者在表單上若修改了預設評語的任何一個字，該評語就會被歸入 others，
    //   不會被計入 specifics，導致 Top 5 排行出現的項目遠少於預期。
    //
    // 解法：加入模糊比對函式 fuzzyMatch()。
    //   做法是計算「共同字元比例」（取兩字串去重後的交集字元數 / 較長字串長度）。
    //   當相似度 >= FUZZY_THRESHOLD 時，視為同一條評語，歸入對應的預設項目計數。
    //   若低於閾值，才歸入 others（真正的自訂評語）。
    var FUZZY_THRESHOLD = 0.75; // 75% 相似度即視為同一條評語

    function fuzzyMatch(a, b) {
        if (a === b) return 1;
        var setA = {}, setB = {};
        for (var i = 0; i < a.length; i++) setA[a[i]] = true;
        for (var j = 0; j < b.length; j++) setB[b[j]] = true;
        var intersect = 0;
        Object.keys(setA).forEach(function(ch) { if (setB[ch]) intersect++; });
        var longer = Math.max(Object.keys(setA).length, Object.keys(setB).length);
        return longer === 0 ? 1 : intersect / longer;
    }

    function findBestMatch(cat, text) {
        // 先嘗試完全比對
        if (parsedDifficulties[cat].specifics[text] !== undefined) return text;
        // 再嘗試模糊比對：在該類別的所有預設評語中找相似度最高者
        var bestKey   = null;
        var bestScore = 0;
        Object.keys(parsedDifficulties[cat].specifics).forEach(function(preset) {
            var score = fuzzyMatch(text, preset);
            if (score > bestScore) { bestScore = score; bestKey = preset; }
        });
        return (bestScore >= FUZZY_THRESHOLD) ? bestKey : null;
    }

    (data.rawImprovements || []).forEach(function(str) {
        if (!str) return;
        str.split('\n').forEach(function(line) {
            var m = line.match(/^\[(.*?)\]\s*(.*)$/);
            if (!m) return;
            var cat  = m[1].trim();
            var text = m[2].trim();
            if (!parsedDifficulties[cat] || !text) return;
            parsedDifficulties[cat].total++;
            var matchedKey = findBestMatch(cat, text);
            if (matchedKey !== null) {
                // 完全比對 或 模糊比對成功 → 歸入預設項目
                parsedDifficulties[cat].specifics[matchedKey]++;
            } else {
                // 真正的自訂評語 → 歸入 others
                parsedDifficulties[cat].others.push(text);
            }
        });
    });

    // ── Top 5 計算（包含 count === 0 的項目也納入候選，確保資料少時仍盡力顯示）──
    var allItems = [];
    Object.keys(parsedDifficulties).forEach(function(cat) {
        Object.keys(parsedDifficulties[cat].specifics).forEach(function(text) {
            var count = parsedDifficulties[cat].specifics[text];
            if (count > 0) allItems.push({ cat: cat, text: text, count: count });
        });
        // 同時將 others（自訂評語）也納入排行（以 count=1 計，避免遺漏）
        var othersMap = {};
        parsedDifficulties[cat].others.forEach(function(t) {
            othersMap[t] = (othersMap[t] || 0) + 1;
        });
        Object.keys(othersMap).forEach(function(t) {
            allItems.push({ cat: cat, text: t, count: othersMap[t], isOther: true });
        });
    });
    allItems.sort(function(a, b) { return b.count - a.count; });
    // 取前 5，若不足 5 則顯示全部有勾選的項目
    var top5 = allItems.slice(0, 5);

    // KPI：最高頻能力缺口（以類別總計）
    var catTotals = Object.keys(parsedDifficulties).map(function(cat) {
        return { cat: cat, total: parsedDifficulties[cat].total };
    });
    catTotals.sort(function(a, b) { return b.total - a.total; });
    if (catTotals.length > 0 && catTotals[0].total > 0) {
        document.getElementById('top-issue-cat').textContent   = catTotals[0].cat;
        document.getElementById('top-issue-count').textContent = '累計 ' + catTotals[0].total + ' 次標記';
    }

    renderTop5(top5);

    // ── 圖表 ──
    drawEpaChart('respEpaChart',  data.epaStats.resp);
    drawEpaChart('intubEpaChart', data.epaStats.intub);
    drawDiffChart('respDiffChart',  respCategories);
    drawDiffChart('intubDiffChart', intubCategories);
}

// ── Top 5 渲染 ──
function renderTop5(items) {
    var container = document.getElementById('top5List');
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="no-data-state">尚無任何被勾選的待改進項目，請完成更多評估後再查看。</div>';
        return;
    }
    container.innerHTML = '';
    items.forEach(function(item, idx) {
        var div = document.createElement('div');
        div.className = 'top5-item';
        var catLabel = '【' + escapeHtml(item.cat) + '】';
        if (item.isOther) catLabel += '&ensp;<span style="font-size:11px;color:#9ca3af;">自訂評語</span>';
        div.innerHTML =
            '<div class="top5-rank">' + (idx + 1) + '</div>' +
            '<div>' +
                '<div class="top5-text">' + escapeHtml(item.text) + '</div>' +
                '<div class="top5-cat">' + catLabel + '</div>' +
            '</div>' +
            '<div class="top5-badge">' + item.count + '&thinsp;次</div>';
        container.appendChild(div);
    });
    // 資料不足 5 筆時給予提示
    if (items.length < 5) {
        var note = document.createElement('div');
        note.style.cssText = 'text-align:center;font-size:13px;color:#9ca3af;padding:12px 0 4px;';
        note.textContent = '目前僅有 ' + items.length + ' 筆有效資料，累積更多評估後排行將更完整。';
        container.appendChild(note);
    }
}

// ── EPA 甜甜圈圖 ──
function drawEpaChart(canvasId, stats) {
    new Chart(document.getElementById(canvasId), {
        type: 'doughnut',
        data: {
            labels: ['等級一','等級二','等級三','等級四','等級五'],
            datasets: [{
                data: [stats['1'], stats['2'], stats['3'], stats['4'], stats['5']],
                backgroundColor: ['#fca5a5','#fdba74','#fde68a','#6ee7b7','#93c5fd'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 12, font: { size: 13, family: "'Noto Sans TC', sans-serif" }, color: '#4b5563' }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ' ' + ctx.label + '：' + ctx.parsed + ' 人'; }
                    }
                }
            }
        }
    });
}

// ── 能力缺口橫向長條圖 ──
function drawDiffChart(canvasId, categories) {
    var dataVals = categories.map(function(cat) { return parsedDifficulties[cat].total; });
    var maxVal   = Math.max.apply(null, dataVals) || 1;
    // 顏色熱力：次數越高顏色越深（紅色調）
    var bgColors = dataVals.map(function(v) {
        var t = v / maxVal; // 0~1
        var alpha = 0.30 + t * 0.60;
        return 'rgba(220,38,38,' + alpha + ')';
    });

    new Chart(document.getElementById(canvasId), {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: '待改進次數',
                data: dataVals,
                backgroundColor: bgColors,
                borderColor: 'rgba(220,38,38,0.75)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ' 累計 ' + ctx.parsed.x + ' 次'; }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: '#9ca3af', font: { size: 13 } },
                    grid: { color: '#f3f4f6' }
                },
                y: {
                    ticks: { color: '#111827', font: { size: 14, weight: '500' } },
                    grid: { display: false }
                }
            },
            onClick: function(e, elements) {
                if (elements.length > 0) openModal(categories[elements[0].index]);
            }
        }
    });
}

// ── 細節 Modal ──
function openModal(category) {
    document.getElementById('modalTitle').textContent = '【' + category + '】 失誤細節分析';
    var catData    = parsedDifficulties[category];
    var fullTexts  = Object.keys(catData.specifics);
    var counts     = Object.values(catData.specifics);

    // y 軸 label：超過 16 字自動折行（Chart.js 支援 array label）
    var shortLabels = fullTexts.map(function(t) {
        var parts = [];
        for (var i = 0; i < t.length; i += 16) parts.push(t.substring(i, i + 16));
        return parts;
    });

    if (currentModalChart) currentModalChart.destroy();

    currentModalChart = new Chart(document.getElementById('modalChart'), {
        type: 'bar',
        data: {
            labels: shortLabels,
            datasets: [{
                label: '發生次數',
                data: counts,
                backgroundColor: 'rgba(220,38,38,0.55)',
                borderColor: 'rgba(220,38,38,0.90)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(ctx) { return fullTexts[ctx[0].dataIndex]; },
                        label: function(ctx) { return ' 發生 ' + ctx.parsed.x + ' 次'; }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: '#9ca3af', font: { size: 13 } },
                    grid: { color: '#f9fafb' }
                },
                y: {
                    ticks: { color: '#111827', font: { size: 13 } },
                    grid: { display: false }
                }
            }
        }
    });

    // 其他/修改後評語
    var listEl = document.getElementById('otherCommentsList');
    var block  = document.getElementById('otherCommentsBlock');
    listEl.innerHTML = '';
    if (catData.others.length === 0) {
        block.style.display = 'none';
    } else {
        block.style.display = 'block';
        catData.others.forEach(function(txt) {
            var li = document.createElement('li');
            li.textContent = txt;
            listEl.appendChild(li);
        });
    }

    document.getElementById('detailModal').classList.add('open');
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('open');
}

function handleModalClick(event) {
    if (event.target === document.getElementById('detailModal')) closeModal();
}

// ── 工具函式 ──
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
