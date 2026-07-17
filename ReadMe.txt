==================================================================
*!!!!!!!!!!必讀!!!!!!!!!!*
1. 開啟VS 2022後，點選複製儲存庫，貼上以下指令:
https://github.com/tsaijunglee/PawPuff_Management.git

2. 建立個人分支，切換並進行開發。
開發期間以更動自己的Controllers、Views、css、js為主，
除了在三層式架構相關資料夾(DTOs、Infra、Repositories、Services、ViewModels)新增class、Program進行Service的DI註冊外，
避免更動到共用程式或他人的程式。
所有按鈕切換的Views都位在Index，可自行將彈窗新增/詳情頁拆分。並且，須自行將原先假資料部分改為串接後端資料庫。

3. 開發一定時間後一同至Github進行逐個分支的合併操作、確認無合併衝突，
完成後再次拉取主分支，並建立新個人分支繼續新一輪開發。
==================================================================
master 主分支內容(2026/7/17):
[v]新增MVC專案與ReadMe
[v]反向工程連接EfModels、appsettings新增連線字串
[v]Program內DI註冊PawPuffContext (註解預留: Repository/Service註冊參考、Cookie Authentication參考)
[v]_Layout放入前端畫面左側按鈕與上側狀態欄
[v]建立空白Controllers，產生View並搬入前端畫面、串接至_Layout (客服工單預留連結，未來依需建立串接)
[v]加入圖床連接基礎共用程式: R2Service (含appsettings更改、Program註冊DI)
==================================================================
- 後續使用圖床須遵照以下二步驟(以:Views/Shop/Index頁面，要進行上傳至圖床、並從圖床中讀取圖片預覽為例):

1. 到控制器Controllers中改寫程式(例:Controllers/ShopController):
	public class ShopController : Controller
	{
		private readonly R2Service _r2Service;
		private readonly List<string> _allowedExtensions = new() { ".jpg", ".jpeg", ".png", ".gif", ".webp" };

		// 透過相依性注入 (Dependency Injection) 取得 R2Service
		public ShopController(R2Service r2Service)
		{
			_r2Service = r2Service;
		}

		// 首頁畫面
		public IActionResult Index()
		{
			return View();
		}

		// 處理圖片上傳的 POST 動作
		[HttpPost]
		public async Task<IActionResult> Upload(IFormFile imageFile, string folder) //1. 新增接收 folder 參數
		{
			if (imageFile == null || imageFile.Length == 0)
			{
				ViewBag.Error = "請選擇要上傳的圖片！";
				return View("Index");
			}

			// 限制副檔名，防止惡意上傳
			var ext = Path.GetExtension(imageFile.FileName).ToLower();
			if (!_allowedExtensions.Contains(ext))
			{
				ViewBag.Error = "不支援的格式！僅允許 JPG, PNG, GIF, WEBP 圖片。";
				return View("Index");
			}

			// 限制檔案大小 (例如最大 5MB = 5 * 1024 * 1024 bytes)
			if (imageFile.Length > 5 * 1024 * 1024)
			{
				ViewBag.Error = "檔案太大！圖片上限為 5MB。";
				return View("Index");
			}

			try
			{
				// 2. 將 folder 變數一起傳給 R2 服務進行上傳
				string imageUrl = await _r2Service.UploadImageAsync(imageFile, folder);

				// 將網址傳遞給前端 View 顯示
				ViewBag.ImageUrl = imageUrl;
			}
			catch (Exception ex)
			{
				ViewBag.Error = $"上傳失敗，原因：{ex.Message}";
			}

			return View("Index");
		}
	}

2. 在想要使用的頁面Views(例:Views/Shop/Index)，參考以下程式改寫畫面[不可直接覆蓋，須擷取所需的上傳或讀取段落程式!!!]:

@{
    ViewData["Title"] = "我的 R2 自建圖床";
}

<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-8 text-center">
            <h1 class="display-5 mb-4">🖼️ Cloudflare R2 私人圖床</h1>
            <p class="text-muted">上傳您的圖片，立即獲取高速且免費外連的 URL 連結。</p>

            @if (ViewBag.Error != null)
            {
                <div class="alert alert-danger" role="alert">
                    ⚠️ @ViewBag.Error
                </div>
            }

            <div class="card shadow-sm p-4 mb-4">
                <form asp-controller="Shop" asp-action="Upload" method="post" enctype="multipart/form-data">

                    <div class="mb-3 text-start">
                        <label for="folder" class="form-label fw-bold">儲存目錄 (選填)</label>
                        <select class="form-select" id="folder" name="folder">
                            <option value="">根目錄 (不分類)</option>
                            <option value="article">📁 article (文章圖片)</option>
                            <option value="webshop">📁 webshop (商品圖片)</option>
                        </select>
                        <div class="form-text">選擇圖片要歸類到 R2 上的哪一個虛擬資料夾。</div>
                    </div>

                    <div class="mb-3 text-start">
                        <label for="imageFile" class="form-label fw-bold">選擇圖片檔案</label>
                        <input class="form-control" type="file" id="imageFile" name="imageFile" accept="image/*" required>
                        <div class="form-text">支援格式：JPG, PNG, GIF, WEBP (單一檔案上限 5MB)</div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-lg w-100">開始上傳</button>
                </form>
            </div>

            @if (ViewBag.ImageUrl != null)
            {
                <div class="card shadow border-success p-4">
                    <h4 class="text-success mb-3">🎉 上傳成功！</h4>

                    <div class="mb-3">
                        <img src="@ViewBag.ImageUrl" class="img-fluid rounded border shadow-sm" style="max-height: 300px;" alt="上傳預覽" />
                    </div>

                    <div class="mb-3 text-start">
                        <label class="form-label fw-bold">圖片直連 URL：</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="imgUrl" value="@ViewBag.ImageUrl" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="copyUrl()">複製連結</button>
                        </div>
                    </div>
                </div>
            }
        </div>
    </div>
</div>

@section Scripts {
    <script>
        // 一鍵複製網址的 JS 函數
        function copyUrl() {
            var copyText = document.getElementById("imgUrl");
            copyText.select();
            copyText.setSelectionRange(0, 99999); // 手機端相容

            // 複製到剪貼簿
            document.execCommand("copy");

            // 提示使用者已複製
            alert("已成功複製圖片網址！");
        }
    </script>
}
==================================================================