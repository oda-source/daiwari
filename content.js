// 拡張機能のポップアップからデータを受け取ったときの処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_AUTOMATION") {
    const { mediaCode, shipDate, volume, fileNames } = request.data;
    
    // 最初のファイルから処理を開始する
    processFile(fileNames, 0, { mediaCode, shipDate, volume });
    sendResponse({ status: "started" });
  }
  return true;
});

// ファイルを1件ずつ順番に処理する関数
async function processFile(fileNames, index, commonData) {
  if (index >= fileNames.length) {
    alert("すべてのファイルの登録処理が完了しました！");
    return;
  }

  const currentFileName = fileNames[index];
  
  // 【ファイル名からコース番号を抽出】
  // 例: P09_5K589_八ヶ岳ロッジ_A4.pdf -> "_"で区切った2番目（5K589）を取得
  const fileNameParts = currentFileName.split('_');
  if (fileNameParts.length < 2) {
    alert(`ファイル名「${currentFileName}」からコース番号を正しく抽出できませんでした。処理を中断します。`);
    return;
  }
  const courseNumber = fileNameParts[1];

  // --- フォームへの入力処理 ---
  try {
    // 1. 媒体コードを入力し、サイト側の連動処理(JavaScript)を起動させる
    // ※実際のサイトの「媒体コード」入力欄のHTMLに合わせ、属性（nameやidなど）を調整してください
    const mediaInput = document.querySelector('input[placeholder*="媒体コード"]') || document.querySelector('input[name*="code"]');
    if (mediaInput) {
      mediaInput.value = commonData.mediaCode;
      // サイト側に「入力が変わったよ」と認識させるための魔法のコマンド
      mediaInput.dispatchEvent(new Event('input', { bubbles: true }));
      mediaInput.dispatchEvent(new Event('change', { bubbles: true }));
      mediaInput.blur(); // フォーカスを外して確定させる
    }

    // 2. コース番号の入力
    const courseInput = document.querySelector('input[placeholder*="コース番号"]') || document.querySelector('input[name*="course"]');
    if (courseInput) {
      courseInput.value = courseNumber;
      courseInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 3. 発送日の入力
    const dateInput = document.querySelector('input[type="date"]') || document.querySelector('input[id*="date"]');
    if (dateInput && commonData.shipDate) {
      dateInput.value = commonData.shipDate;
    }

    // 4. 部数の入力
    const volumeInput = document.querySelector('input[placeholder*="部数"]') || document.querySelector('input[name*="busu"]');
    if (volumeInput && commonData.volume) {
      volumeInput.value = commonData.volume;
    }

    // 5. 【固定値】営業本部と出発地の自動選択
    // ※実際の選択肢（value値）や項目名に合わせて書き換えが必要です
    const mainOfficeSelect = document.querySelector('select[name*="honbu"]') || document.querySelector('select');
    if (mainOfficeSelect) {
      // 例: 2番目の選択肢を選ばせる、または特定の支店名(value)を指定する
      mainOfficeSelect.selectedIndex = 1; 
      mainOfficeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const departureSelect = document.querySelector('select[name*="shuppatsu"]') || document.querySelectorAll('select')[1];
    if (departureSelect) {
      departureSelect.selectedIndex = 1;
      departureSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 6. ファイル名入力欄へのダミーセット（ブラウザの仕様上、実際のファイルを自動ドロップできないための対策）
    const fileNameDisplayInput = document.querySelector('input[name*="filename"]') || document.querySelector('input[type="text"]');
    if (fileNameDisplayInput) {
      fileNameDisplayInput.value = currentFileName;
    }

    // 少し時間を置いてサイト側の「媒体名」などの自動読み込みを待つ（0.5秒）
    await new Promise(resolve => setTimeout(resolve, 500));

    // --- ポップアップでの人間の確認を挟む ---
    const confirmMessage = `【自動入力確認 ${index + 1} / ${fileNames.length} 件目】\n\n` +
                           `ファイル名: ${currentFileName}\n` +
                           `コース番号: ${courseNumber}\n` +
                           `媒体コード: ${commonData.mediaCode}\n\n` +
                           `この内容で「一括登録」を押して次のファイルに進みますか？`;

    if (confirm(confirmMessage)) {
      // ユーザーが「OK」を押したら、右下の赤い「一括登録」ボタンをクリック
      const registerBtn = document.querySelector('button.red') || document.querySelector('input[value="一括登録"]') || [...document.querySelectorAll('button, input[type="button"]')].find(el => el.textContent.includes('登録') || el.value.includes('登録'));
      
      if (registerBtn) {
        // 本番時に自動でボタンを押す場合は、下のコメントアウトを解除してください
        // registerBtn.click();
        
        console.log(`${currentFileName} の登録ボタンをクリックしました（想定）`);
      } else {
        alert("「一括登録」ボタンが見つかりませんでした。手動で押してください。");
      }

      // ページがリロードされる、または次のファイルへ進む（デモ用に2秒待って次へ）
      await new Promise(resolve => setTimeout(resolve, 2000));
      processFile(fileNames, index + 1, commonData);

    } else {
      alert("自動登録を一時停止しました。画面を確認してください。");
    }

  } catch (error) {
    alert(`エラーが発生しました: ${error.message}`);
  }
}
