// 登録フォーム（input_honbu_cd）が存在する部屋でのみ実行する
if (!document.querySelector('select[name="input_honbu_cd"]') && !window.location.href.includes('continuous')) {
  // 対象外のフレームでは動かさない
} else {

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_AUTOMATION") {
      const { mediaCode, shipDate, volume, fileNames } = request.data;
      createConfirmPanel();
      processFile(fileNames, 0, { mediaCode, shipDate, volume });
      sendResponse({ status: "started" });
    }
    return true;
  });

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
        <button id="ext-btn-ok" style="flex:1; padding:8px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">次へ（確認終了）</button>
        <button id="ext-btn-cancel" style="padding:8px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">中止</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  // 確実に入力イベントを発生させる関数
  function forceInputValue(inputElement, value) {
    if (!inputElement) return;
    inputElement.focus();
    inputElement.value = value;
    const events = ['input', 'change', 'propertychange', 'keyup', 'keydown', 'blur'];
    events.forEach(eventName => {
      inputElement.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
    });
    inputElement.blur();
  }

  // ドロップダウンを確実に対象の値（value）で選択する関数
  function forceSelectValue(selectElement, targetValue) {
    if (!selectElement) return;
    selectElement.focus();
    
    let matched = false;
    for (let i = 0; i < selectElement.options.length; i++) {
      if (selectElement.options[i].value === targetValue) {
        selectElement.selectedIndex = i;
        matched = true;
        break;
      }
    }
    
    if (matched) {
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.blur();
    }
  }

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

    // --- 【解析に基づいたピンポイント自動入力】 ---
    
    // 1. 媒体コード（name="media_cd"）
    const mediaInput = document.querySelector('input[name="media_cd"]');
    if (mediaInput) {
      forceInputValue(mediaInput, commonData.mediaCode);
    }

    // 2. コース番号（name="course_no"）
    const courseInput = document.querySelector('input[name="course_no"]');
    if (courseInput) {
      forceInputValue(courseInput, courseNumber);
    }

    // 3. 発送日（name="hassou_ymd"）
    const dateInput = document.querySelector('input[name="hassou_ymd"]');
    if (dateInput && commonData.shipDate) {
      const cleanDate = commonData.shipDate.replace(/-/g, ''); // YYYYMMDD形式に変換
      forceInputValue(dateInput, cleanDate);
    }

    // 4. 部数（name="busu"）
    const volumeInput = document.querySelector('input[name="busu"]');
    if (volumeInput && commonData.volume) {
      forceInputValue(volumeInput, commonData.volume);
    }

    // 5. 【固定値】営業本部 ➔ メディア営業本部（値: 15）を選択
    const honbuSelect = document.querySelector('select[name="input_honbu_cd"]');
    if (honbuSelect) {
      forceSelectValue(honbuSelect, "15");
    }

    // 6. 【固定値】出発地 ➔ 関西（値: 02）を選択
    const syuppatsuSelect = document.querySelector('select[name="input_shuppatsu_cd"]');
    if (syuppatsuSelect) {
      forceSelectValue(syuppatsuSelect, "02");
    }

    // サイト側JavaScriptの連動処理を少し待つ（0.4秒）
    await new Promise(resolve => setTimeout(resolve, 400));

    // ナビゲーションパネルの表示更新
    infoContent.innerHTML = `
      <b>処理中:</b> ${index + 1} / ${fileNames.length} 件目<br>
      <b>ファイル名:</b> <span style="color:#555;">${currentFileName}</span><br>
      <b>抽出コース番号:</b> <span style="color:#d9534f; font-weight:bold;">${courseNumber}</span><br><br>
      <span style="color:#28a745; font-size:12px; font-weight:bold;">左側のフォームをご確認ください。<br>媒体コード、コース番号、発送日、部数、そして営業本部（メディア営業本部）と出発地（関西）が自動入力されていれば大成功です！</span>
    `;

    return new Promise((resolve) => {
      document.getElementById('ext-btn-ok').onclick = () => {
        resolve(processFile(fileNames, index + 1, commonData));
      };
      document.getElementById('ext-btn-cancel').onclick = () => {
        alert("自動登録を中止しました。");
        panel.remove();
      };
    });
  }
}
