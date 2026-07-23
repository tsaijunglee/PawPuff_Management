namespace PawPuff_Management.Models.ViewModels
{
	public class OwnedCombinationsIndexViewModel
	{
		public int BodySortOrder { get; set; } = 4;

		public List<OwnedCombinationItemViewModel> Items { get; set; } = new();

		public int TotalCount => Items.Count;
	}

	public class OwnedCombinationItemViewModel
	{
		public int Id { get; set; }

		public int UserId { get; set; }

		public string UserAccount { get; set; } = string.Empty;

		public OwnedCombinationBodyViewModel Body { get; set; } = new();

		public OwnedCombinationColorViewModel? BodyColor { get; set; }

		public OwnedCombinationAccessoryViewModel? Accessory1 { get; set; }

		public OwnedCombinationAccessoryViewModel? Accessory2 { get; set; }

		public OwnedCombinationAccessoryViewModel? Accessory3 { get; set; }
	}

	public class OwnedCombinationBodyViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string ImageName { get; set; } = string.Empty;

		public string ImageUrl { get; set; } = string.Empty;
	}

	public class OwnedCombinationAccessoryViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string LineImageName { get; set; } = string.Empty;

		public string LineImageUrl { get; set; } = string.Empty;

		public string MaskImageName { get; set; } = string.Empty;

		public string MaskImageUrl { get; set; } = string.Empty;

		public int SortOrder { get; set; }

		public OwnedCombinationColorViewModel? Color { get; set; }
	}

	public class OwnedCombinationColorViewModel
	{
		public int Id { get; set; }

		public string Name { get; set; } = string.Empty;

		public string? HexCode { get; set; }
	}
}
