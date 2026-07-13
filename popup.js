const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

let selectedFiles = [];

// 青い枠をクリックしたらファイル選択を開く
dropZone.addEventListener('click', () => fileInput.click());

// ファイルが選択されたら情報を保存
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);
  if (selectedFiles.length > 0) {
    statusText.innerText = `${selectedFiles.length}個のファイルが選択されています`;
    statusText.style.color = '#28a745';
  } else {
    statusText.innerText = 'ファイル未選択';
    statusText.style.color = '#666';
  }
});

// 「自動登録を開始する」ボタンを押したときの処理
startBtn.addEventListener('click', async () => {
  const mediaCode = document.getElementById('mediaCode').value;
  const shipDate = document.getElementById('shipDate').value;
  const volume = document.getElementById('volume').value;

  // バリデーション（媒体コードは必須）
  if (!mediaCode) {
    alert('媒体コードを入力してください。');
    return;
  }
  if (selectedFiles.length === 0) {
    alert('登録するPDFファイルを選択してください。');
    return;
  }

  // ファイル名リストを作成（ブラウザの制限上、パスではなく名前だけを操作側に送る）
  const fileNames = selectedFiles.map(file => file.name);

  // 現在開いている旅行会社のタブ（Brain管理画面）を探す
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    alert('対象のウェブページが見つかりません。');
    return;
  }

  // 操作用スクリプト（content.js）へ、共通データとファイル名のリストを送信して開始
  chrome.tabs.sendMessage(tab.id, {
    action: "START_AUTOMATION",
    data: {
      mediaCode: mediaCode,
      shipDate: shipDate,
      volume: volume,
      fileNames: fileNames
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      alert('エラー：Brainの管理画面を開いた状態で、拡張機能を実行してください。');
    } else {
      // ポップアップ画面を閉じて、実際の登録画面の自動入力に移る
      window.close();
    }
  });
});
