using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawPuff_Management.Models.DTOs;
using PawPuff_Management.Models.Services;
using System.Security.Claims;

namespace PawPuff_Management.Controllers
{
	public class AuthController : Controller
	{
		private readonly AdminService _service;
		public AuthController( AdminService service) 
		{
			_service = service;
		}


		[AllowAnonymous] //允許尚未登入的人進入這個方法。因為登入頁本來就必須讓未登入者使用，否則會造成無限跳轉。
		[HttpGet] //瀏覽器開啟
		public IActionResult Index()
		{
			if (User.Identity?.IsAuthenticated == true) //目前這次請求的使用者登入身分,Cookie 是否已通過驗證
				return RedirectToAction("Index", "Home"); //重新導向至：/ Home / Index

			return View(new LoginDto());//尚未登入時,建立一個空的 LoginDto：Views/Auth/Index.cshtml
		}



		[AllowAnonymous]//允許未登入者呼叫。登入功能本來就是提供給未登入者使用
		[HttpPost]//處理表單送出的 POST 請求
		[ValidateAntiForgeryToken] //驗證防偽權杖，用來降低 CSRF 跨網站請求偽造攻擊
								   //使用 async 是因為登入過程要等待資料庫查詢及 Cookie 寫入
		public async Task<IActionResult> Index(LoginDto request) //接收LoginDto的Account,Password
		{
			//ASP.NET Core 會根據 LoginDto 的驗證標註檢查資料
			//例如:[Required(ErrorMessage = "請輸入帳號。")]
			if (!ModelState.IsValid) return View(request); 

			var result = await _service.LoginAsync(request);//呼叫 AdminService的LoginAsync()驗證帳密

			if (!result.IsSuccess || result.Admin is null) //IsSuccess是false 或 沒有回傳管理員資料 => 處理登入失敗
			{
				//string.Empty 表示這是整張表單的錯誤
				//將 Service 的錯誤訊息加入頁面驗證錯誤，例如：帳號或密碼錯誤。此管理員帳號已停用。
				ModelState.AddModelError(
					string.Empty, 
					result.Message);

				return View(request); //重新顯示登入頁，並保留使用者輸入的帳號。
			}

			var admin = result.Admin; //取得驗證成功的管理員


			//建立 Claims 
			//Claim 是描述目前登入者的身分資料
			var claims = new List<Claim>
			{
				//目前 Cookie 裡面有儲存內容:管理員ID,管理員帳號,管理員暱稱
				new(ClaimTypes.NameIdentifier,admin.Id.ToString()),

				new(ClaimTypes.Name,admin.Account),

				new("Nickname",admin.Nickname)
			};

			//登入 Cookie 要新增權限 Claim
			claims.AddRange(
	          admin.AdminsPermissions.Select(permission => new Claim("Permission",permission.PermissionName) ));


			//建立登入身分
			//把剛才的 Claims 組成一個身分，並指定這個身分使用 Cookie Authentication。
			//AuthenticationScheme 可以理解成驗證機制的名稱。
			var identity = new ClaimsIdentity(claims,CookieAuthenticationDefaults.AuthenticationScheme);

			//建立使用者本人
			//ClaimsPrincipal 表示目前的使用者，可以包含一個或多個身分
			var principal = new ClaimsPrincipal(identity);

			//
			//Claim ＝一項身分資料
			//ClaimsIdentity ＝一組身分資料
			//ClaimsPrincipal＝代表目前登入的使用者
			//			

			//HttpContext.User使用的就是 ClaimsPrincipal
			//
			//
			//寫入登入 Cookie
			//SignInAsync() 會將 principal 的身分資料加密、簽章，產生 Authentication Cookie，再回傳給瀏覽器
			await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,principal,
				new AuthenticationProperties
				{
					//IsPersistent = true => 瀏覽器關閉後 Cookie 仍可能保留，通常會搭配「記住我」功能

					IsPersistent = false, //表示使用非持久性 Cookie。通常關閉瀏覽器後，瀏覽器會移除這個 Cookie，因此下次需要重新登入
					AllowRefresh = true
				});

			//登入成功後轉向首頁 => /Home/Index
			return RedirectToAction("Index", "Home");
		}


		//「登出功能」：刪除目前管理員的驗證 Cookie，然後回到登入頁
		[Authorize]//表示只有已登入的使用者可以執行登出
		[HttpPost] //
		[ValidateAntiForgeryToken] //檢查防偽權杖，防止其他網站偷偷替管理員送出登出請求
		public async Task<IActionResult> Logout()
		{
			//登出的核心 => 它會要求 Cookie Authentication 清除目前瀏覽器的登入 Cookie
			await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

			return RedirectToAction(nameof(Index)); //登出完成後導向目前這個 AuthController 的 Index Action，也就是登入頁：/Auth/Index
		}



	}
}
