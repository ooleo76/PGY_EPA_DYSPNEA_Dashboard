// ============================================================
// ▼▼▼ 設定區：請填入您的 GAS 部署網址 ▼▼▼
// ============================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbx_HP26PxVSXpqc5Ap_C3MiOPv76uzvaJYcRe3OghOtGKXjL1JHT6a7Cw6Vnd_4l9KojA/exec"; 
// ============================================================

let currentModalChart = null;

// 將表單的原始語句寫死在這裡，以供比對。如果有修改的文字就會被歸類在「其他」。
const predefinedTexts = {
    "病史收集": ["病史收集不完整，需要更詳細詢問相關症狀", "需要加強詢問過去病史與用藥史", "應詢問症狀發生的時間序列與誘發因子", "如果有擔心的疾病，可重點針其併發的症狀做詢問", "在病人出現危急狀況時，需要以快速、重點的方式來取得資訊"],
    "理學檢查": ["呼吸道評估不完整，醒著病人可請其咳嗽評估", "體液評估不足(水腫等)", "如擔心貧血，可以直接看conjunctiva", "生命徵象監測與評估需要更積極", "擔心酸鹼問題，可以注意是否有kussmaul breathing"],
    "處置與治療": ["急性病人處置反應過慢，需要更迅速行動", "氧氣治療策略可更靈活，可先給予高濃度氧氣(如VM 50%或NRM)，再依反應逐步下調", "對於COPD急性惡化病人，當呼吸費力或低血氧時，不應固守SpO2 88-92%的目標，仍需優先矯正低血氧", "升階抗生素不急迫，會浪費人力資源", "給氧氣後仍需等待一段時間才會有反應"],
    "檢驗檢查": ["抽血項目應對應可能的診斷，對於低血氧的病人，最重要的是ABG", "ABG的判讀(PaO2, PaCO2, PF ratio)需要加強", "檢查的判讀還需與臨床做結合，才能綜合判斷", "檢查結果解讀不完整", "CXR可以跟之前的做比較"],
    "交班報告": ["交班需要包含基本的資訊(如：病人基本資料、過去病史、目前狀況、治療計畫)", "應學習整合資訊並講出評估結果(如：PNA in progression或Fluid overload)", "交班結構可再加強，應包含評估、處置、反應、鑑別診斷與下一步計畫", "交班內容組織不佳，缺乏邏輯性", "交班缺乏臨床思維，僅報告數據"],
    "插管前準備": ["備物流程不夠熟練，應在開始前將所有器械(Endo, Blade, EtCO2等)準備齊全", "器材規格與名稱需更熟悉(如Endo size：男7.5-8, 女7-7.5; Laryngoscope blade 3或4號)", "Pre-oxygenation不確實，應使用NRM或BVM給予純氧至少2-3分鐘", "擺位不當，忘記備中單等細節", "使用BVM時未注意密合度，應練習正確的CE手勢或是雙人操作以防止漏氣", "使用BVM時，如清醒病人可以自主呼吸，直接使用面罩罩住給予氧氣；如果直接bagging會造成病人不適"],
    "藥物給予": ["插管前未確認血壓", "藥物劑量不熟悉，需熟記常用藥物劑量(如Propofol 1mg/kg, Dormicum 0.1-0.3mg/kg)", "肌肉鬆弛劑劑量需熟記(如Succinylcholine 1.5mg/kg, Rocuronium 1mg/kg)", "給藥前未確認病人體重，影響劑量準確性", "備藥與給藥不同，下達醫囑時須包含\"藥物\"、\"劑量\"、\"途徑\"、\"頻次\"", "常要給予Challenge fluid (如NS 500ml) 時機不當，應有休克或體液不足等證據支持"],
    "插管技術": ["Blade放置過深，應貼著舌頭根本處以利掀起會厭，避免佔據氣管內管置入空間", "插管中若血氧下降，應立即暫停並確實使用BVM給氧", "插管技巧需要更多練習", "手握Endo的位置過低，會使插管過程中斷", "插管時間過長，動作不夠流暢"],
    "插管後評估": ["插管後未立即監測生命徵象(特別是因正壓通氣及藥物影響下的血壓)", "End-tidal CO2監測與判讀不熟(使用波形確認位置)", "未安排或忘記追蹤CXR，以確認氣管內管深度(Carina上2-3cm)與併發症", "可以先使用聽診確定是否有one lung intubation的問題", "可以在建立呼吸道後適時重新追蹤ABG", "回到疾病本身，針對導致插管的疾病做處理(如調整抗生素)"]
};

const respCategories = ["病史收集", "理學檢查", "處置與治療", "檢驗檢查", "交班報告"];
const intubCategories = ["插管前準備", "藥物給予", "插管技術", "插管後評估"];

// 建立資料容器
let parsedDifficulties = {};
Object.keys(predefinedTexts).forEach(cat => {
    parsedDifficulties[cat] = { total: 0, specifics: {}, others: [] };
    predefinedTexts[cat].forEach(text => parsedDifficulties[cat].specifics[text] = 0);
});

document.addEventListener("DOMContentLoaded", () => {
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-count').innerText = data.totalEvaluations + " 份";
            
            // 處理 EPA 圖表
            drawEpaChart('respEpaChart', data.epaStats.resp);
            drawEpaChart('intubEpaChart', data.epaStats.intub);

            // 解析臨床困境文字
            data.rawImprovements.forEach(impString => {
                if(!impString) return;
                const lines = impString.split('\n');
                lines.forEach(line => {
                    const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                    if (match) {
                        const cat = match[1].trim();
                        const text = match[2].trim();
                        if (parsedDifficulties[cat]) {
                            parsedDifficulties[cat].total++;
                            if (parsedDifficulties[cat].specifics[text] !== undefined) {
                                parsedDifficulties[cat].specifics[text]++;
                            } else {
                                parsedDifficulties[cat].others.push(text);
                            }
                        }
                    }
                });
            });

            // 繪製臨床困境總計長條圖
            drawDiffOverviewChart('respDiffChart', respCategories);
            drawDiffOverviewChart('intubDiffChart', intubCategories);
        })
        .catch(error => {
            console.error("載入數據失敗:", error);
            document.getElementById('total-count').innerText = "載入失敗";
        });
});

// 繪製 EPA 甜甜圈圖 (設定 Legend 縮小以防止手機跨行)
function drawEpaChart(canvasId, stats) {
    const labels = ['等級一', '等級二', '等級三', '等級四', '等級五'];
    const dataVals = [stats['1'], stats['2'], stats['3'], stats['4'], stats['5']];
    new Chart(document.getElementById(canvasId), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: dataVals, backgroundColor: ['#ff9999', '#ffcc99', '#ffff99', '#99ccff', '#99ff99'] }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, padding: 8, font: { size: 11 } }
                }
            }
        }
    });
}

// 繪製臨床困境總覽圖 (橫向長條圖)
function drawDiffOverviewChart(canvasId, categories) {
    const dataVals = categories.map(cat => parsedDifficulties[cat].total);
    const bgColors = categories.map(() => 'rgba(54, 162, 235, 0.6)');
    const borderColors = categories.map(() => 'rgba(54, 162, 235, 1)');

    const chart = new Chart(document.getElementById(canvasId), {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{ label: '待改進紀錄次數', data: dataVals, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1 }]
        },
        options: {
            indexAxis: 'y', // 橫向顯示
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    openModal(categories[idx]);
                }
            }
        }
    });
}

// 開啟細節 Modal
function openModal(category) {
    document.getElementById('modalTitle').innerText = `【${category}】 臨床困境細節分析`;
    const catData = parsedDifficulties[category];
    
    // 準備 Modal 長條圖資料 (原始語句)
    const specificLabels = Object.keys(catData.specifics).map(txt => txt.length > 15 ? txt.substring(0,15)+"..." : txt); // 太長截斷以利圖表顯示
    const specificFullTexts = Object.keys(catData.specifics); // 留存完整文字用於 Tooltip
    const specificCounts = Object.values(catData.specifics);

    if (currentModalChart) currentModalChart.destroy();

    currentModalChart = new Chart(document.getElementById('modalChart'), {
        type: 'bar',
        data: {
            labels: specificLabels,
            datasets: [{ label: '發生次數', data: specificCounts, backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => specificFullTexts[context[0].dataIndex] // Tooltip顯示完整句子
                    }
                }
            },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    // 填入其他評語 (評分者自訂或修改過的)
    const listHtml = document.getElementById('otherCommentsList');
    listHtml.innerHTML = '';
    if (catData.others.length === 0) {
        listHtml.innerHTML = '<li>無其他自訂評語</li>';
    } else {
        catData.others.forEach(txt => {
            const li = document.createElement('li');
            li.textContent = txt;
            listHtml.appendChild(li);
        });
    }

    document.getElementById('detailModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// 點擊 Modal 外部也可關閉
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) modal.style.display = "none";
}