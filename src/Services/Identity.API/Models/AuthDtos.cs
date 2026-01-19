namespace Identity.API.Models;

// Kayıt olurken istenecek bilgiler
public class RegisterRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string UserName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
}

// Giriş yaparken istenecek bilgiler
public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

// Başarılı olursa döneceğimiz cevap (Token burada olacak)
public class AuthResponse
{
    public string Email { get; set; }
    public string UserName { get; set; }
    public string Token { get; set; }
}