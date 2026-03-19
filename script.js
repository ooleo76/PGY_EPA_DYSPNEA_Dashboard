// ============================================================
// ▼▼▼ 設定區：請填入同一個 GAS 部署網址 ▼▼▼
// ============================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbx_HP26PxVSXpqc5Ap_C3MiOPv76uzvaJYcRe3OghOtGKXjL1JHT6a7Cw6Vnd_4l9KojA/exec"; 
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    fetch(GAS_URL)
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-count').innerText = data.totalEvaluations + " 份";
            
            const labels = ['等級一', '等級二', '等級三', '等級四', '等級五'];
            const bgColors = ['#ff9999', '#ffcc99', '#ffff99', '#99ccff', '#99ff99'];

            // 繪製呼吸 EPA
            new Chart(document.getElementById('respChart'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: [data.epaStats.resp['1'], data.epaStats.resp['2'], data.epaStats.resp['3'], data.epaStats.resp['4'], data.epaStats.resp['5']],
                        backgroundColor: bgColors
                    }]
                }
            });

            // 繪製插管 EPA
            new Chart(document.getElementById('intubChart'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: [data.epaStats.intub['1'], data.epaStats.intub['2'], data.epaStats.intub['3'], data.epaStats.intub['4'], data.epaStats.intub['5']],
                        backgroundColor: bgColors
                    }]
                }
            });
        })
        .catch(error => {
            console.error("載入數據失敗:", error);
            document.getElementById('total-count').innerText = "載入失敗";
        });
});