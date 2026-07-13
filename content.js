chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_AUTOMATION") {
    const { mediaCode, shipDate, volume, fileNames } = request.data;
    
    // 画面上に確認用の案内パネルを差し込む
    createConfirmPanel();
    
    processFile(fileNames, 0, { mediaCode, shipDate, volume });
    sendResponse({ status: "started" });
  }
  return true;
});

// 画面内に固定で表示する確認用の「操作パネル」を作成する関数
function createConfirmPanel() {
  if (document.getElementById('ext-confirm-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ext-confirm-panel';
  panel.style.position = 'fixed';
  panel.style.top = '20px';
  panel.style.right = '20px';
  panel.style.zIndex = '999999';
  panel.style.backgroundColor = '#ffffff';
  panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  panel.style.padding = '20px';
  panel.style.borderRadius = '8px';
  panel.style.width = '300px';
  panel.style.fontFamily = 'sans-serif';
  panel.style.border = '2px solid #007bff';

  panel.innerHTML = `
    <h4 style="margin:0 0 10px 0; color:#007bff;">Brain 自動登録ナビ</h4>
    <div id="ext-info-content" style="font-size:13px; line-height:1.5; margin-bottom:15px; color:#333;">
      準備中...
    </div>
    <div style="display:flex; gap:10px;">
      <button id="ext-btn-ok" style="flex:1; padding:8px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">一括登録して次へ</button>
      <button id="ext-btn-cancel" style="padding:8px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">中止</button>
    </div>
  `;
  document.body.appendChild(panel);
}

// ファイルを1件ずつ順番に処理する関数
async function processFile(fileNames, index, commonData) {
  const panel = document.getElementById('ext-confirm-panel');
  const infoContent = document.getElementById('ext-info-content');

  if (index >= fileNames.length) {
    infoContent.innerHTML = "<b style='color:#28a745;'>すべての登録処理が完了しました！</b>";
    document.getElementById('ext-btn-ok').style.display = 'none';
    document.getElementById('ext-btn-cancel').textContent = '閉じる';
    document.getElementById('ext-btn-cancel').onclick = () => panel.remove();
    return;
  }

  const currentFileName = fileNames[index];
  const fileNameParts = currentFileName.split('_');
  
  if (fileNameParts.length < 2) {
    alert(`ファイル名「${currentFileName}」からコース番号を抽出できませんでした。`);
    panel.remove();
    return;
  }
  const courseNumber = fileNameParts[1];

  // --- フォームへの自動入力 ---
  // 1. 媒体コード
  const mediaInput = document.querySelector('input[placeholder*="媒体コード"]') || document.querySelector('input[name*="code"]');
  if (mediaInput) {
    mediaInput.value = commonData.mediaCode;
    mediaInput.dispatchEvent(new Event('input', { bubbles: true }));
    mediaInput.dispatchEvent(new Event('change', { bubbles: true }));
    mediaInput.blur();
  }

  // 2. コース番号
  const courseInput = document.querySelector('input[placeholder*="コース番号"]') || document.querySelector('input[name*="course"]');
  if (courseInput) {
    courseInput.value = courseNumber;
    courseInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 3. 発送日
  const dateInput = document.querySelector('input[type="date"]') || document.querySelector('input[id*="date"]');
  if (dateInput && commonData.shipDate) {
    dateInput.value = commonData.shipDate;
  }

  // 4. 部数
  const volumeInput = document.querySelector('input[placeholder*="部数"]') || document.querySelector('input[name*="busu"]');
  if (volumeInput && commonData.volume) {
    volumeInput.value = commonData.volume;
  }

  // 5. 固定値（営業本部・出発地）
  const mainOfficeSelect = document.querySelector('select[name*="honbu"]') || document.querySelector('select');
  if (mainOfficeSelect) {
    mainOfficeSelect.selectedIndex = 1; 
    mainOfficeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const departureSelect = document.querySelector('select[name*="shuppatsu"]') || document.querySelectorAll('select')[1];
  if (departureSelect) {
    departureSelect.selectedIndex = 1;
    departureSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 6. ダミーファイル名
  const fileNameDisplayInput = document.querySelector('input[name*="filename"]') || document.querySelector('input[type="text"]');
  if (fileNameDisplayInput) {
    fileNameDisplayInput.value = currentFileName;
  }

  // 画面に入力値が反映されるのを少し待つ（0.3秒）
  await new Promise(resolve => setTimeout(resolve, 300));

  // パネルの文字を更新（これで背景のフォームに入力された状態で確認できます）
  infoContent.innerHTML = `
    <b>処理中:</b> ${index + 1} / ${fileNames.length} 件目<br>
    <b>ファイル名:</b> <span style="color:#555;">${currentFileName}</span><br>
    <b>抽出コース番号:</b> <span style="color:#d9534f; font-weight:bold;">${courseNumber}</span><br><br>
    <span style="color:#666; font-size:12px;">※左側のフォームに入力された内容を確認してください。</span>
  `;

  // ボタンのイベントを設定して「人間のクリック待ち」状態にする
  return new Promise((resolve) => {
    document.getElementById('ext-btn-ok').onclick = async () => {
      // 実際の「一括登録」ボタンを探してクリック
      const registerBtn = document.querySelector('button.red') || document.querySelector('input[value="一括登録"]') || [...document.querySelectorAll('button, input[type="button"]')].find(el => el.textContent.includes('登録') || el.value.includes('登録'));
      
      if (registerBtn) {
        // ※完全にテスト完了するまではコメントアウトのままにしてあります。
        // 実際に自動で登録ボタンを押させたい場合は、下のスラッシュ2つを消してください
        // registerBtn.click();
        console.log("登録ボタンをクリックしました");
      }

      // 登録処理後、次のファイルへ進む
      resolve(processFile(fileNames, index + 1, commonData));
    };

    document.getElementById('ext-btn-cancel').onclick = () => {
      alert("自動登録を中止しました。");
      panel.remove();
    };
  });
}
