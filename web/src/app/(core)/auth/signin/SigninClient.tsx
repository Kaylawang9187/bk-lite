"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Select } from "antd";
import PasswordResetForm from "./PasswordResetForm";
import OtpVerificationForm from "./OtpVerificationForm";
import { saveAuthToken } from "@/utils/crossDomainAuth";

interface SigninClientProps {
  searchParams: {
    callbackUrl: string;
    error: string;
  };
  signinErrors: Record<string | "default", string>;
}

interface WeChatSettings {
  available: boolean;
  message: string;
  redirectUri?: string;
}

type AuthStep = 'login' | 'reset-password' | 'otp-verification';

interface LoginResponse {
  temporary_pwd?: boolean;
  enable_otp?: boolean;
  qrcode?: boolean;
  token?: string;
  username?: string;
  id?: string;
  locale?: string;
  redirect_url?: string;
}

export default function SigninClient({ searchParams: { callbackUrl, error }, signinErrors }: SigninClientProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState("");
  const [domainList, setDomainList] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [loginData, setLoginData] = useState<LoginResponse>({});
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [wechatAvailable, setWechatAvailable] = useState<boolean | null>(null);
  const [wechatCheckLoading, setWechatCheckLoading] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsWechatBrowser(userAgent.includes('micromessenger') || userAgent.includes('wechat'));
    
    fetchDomainList();
    checkWechatAvailability();
    
    // Handle WeChat login success
    handleWechatLoginSuccess();
  }, []);

  const checkWechatAvailability = async () => {
    try {
      setWechatCheckLoading(true);
      const response = await fetch('/api/auth/wechat/config', {
        method: "GET",
        headers: { 
          "Content-Type": "application/json" 
        },
      });
      
      const data: WeChatSettings = await response.json();
      setWechatAvailable(data.available);
      
      if (!data.available) {
        console.log("WeChat login not available:", data.message);
      }
    } catch (error) {
      console.error("Failed to check WeChat availability:", error);
      setWechatAvailable(false);
    } finally {
      setWechatCheckLoading(false);
    }
  };

  const fetchDomainList = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/proxy/core/api/get_domain_list/', {
        method: "GET",
        headers: { 
          "Content-Type": "application/json" 
        },
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.result && Array.isArray(responseData.data)) {
        setDomainList(responseData.data);
        if (responseData.data.length > 0) {
          setDomain(responseData.data[0]);
        }
      } else {
        console.error("Failed to fetch domain list:", responseData);
        setDomainList([]);
      }
    } catch (error) {
      console.error("Failed to fetch domain list:", error);
      setDomainList([]);
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleWechatLoginSuccess = async () => {
    // Check for WeChat success parameter
    const urlParams = new URLSearchParams(window.location.search);
    console.log("Checking for WeChat login success in URL...", urlParams);
    const wechatSuccess = urlParams.get('wechat_success');
    
    if (wechatSuccess === 'true') {
      console.log("[WeChat Login] Processing WeChat login success");
      setIsLoading(true);
      
      try {
        // Read user data from cookie (set by callback route)
        const wechatUserDataCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('wechat_user_data='));
        
        const wechatCallbackUrlCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('wechat_callback_url='));
        
        if (!wechatUserDataCookie) {
          console.error("[WeChat Login] No WeChat user data found in cookie");
          setFormError("WeChat login data not found");
          setIsLoading(false);
          return;
        }
        
        const userData = JSON.parse(decodeURIComponent(wechatUserDataCookie.split('=')[1]));
        const targetCallbackUrl = wechatCallbackUrlCookie ? 
          decodeURIComponent(wechatCallbackUrlCookie.split('=')[1]) : 
          callbackUrl || "/";
        
        console.log("[WeChat Login] Parsed user data from cookie:", {
          provider: userData.provider,
          wechatOpenId: userData.wechatOpenId ? "Set" : "Not set",
          wechatUnionId: userData.wechatUnionId ? "Set" : "Not set",
        });
        
        // Save auth token to local storage/cookie
        if (userData.token) {
          saveAuthToken({
            id: userData.id,
            username: userData.username || '',
            token: userData.token,
            locale: userData.locale,
            temporary_pwd: userData.temporary_pwd,
            enable_otp: userData.enable_otp,
            qrcode: userData.qrcode,
            provider: userData.provider,
            wechatOpenId: userData.wechatOpenId,
            wechatUnionId: userData.wechatUnionId,
          });
        }

        // Complete NextAuth authentication using credentials provider
        // This will store all WeChat information in the JWT token
        const result = await signIn("credentials", {
          redirect: false,
          username: userData.username,
          password: '', // WeChat login doesn't require password
          skipValidation: 'true', // Skip normal password validation
          userData: JSON.stringify(userData), // Pass complete user data including WeChat info
          callbackUrl: targetCallbackUrl,
        });
        
        console.log("[WeChat Login] NextAuth signIn result:", result);
        
        if (result?.error) {
          console.error("[WeChat Login] NextAuth signIn error:", result.error);
          setFormError("WeChat login authentication failed");
          setIsLoading(false);
        } else if (result?.ok) {
          console.log("[WeChat Login] Authentication successful, redirecting to:", targetCallbackUrl);
          
          // Clean up cookies
          document.cookie = 'wechat_user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'wechat_callback_url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          
          // Clean up URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('wechat_success');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Redirect to target page
          window.location.href = targetCallbackUrl;
        } else {
          console.error("[WeChat Login] Unknown signIn result:", result);
          setFormError("WeChat login failed");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[WeChat Login] Error processing WeChat login success:", error);
        setFormError("Failed to process WeChat login");
        setIsLoading(false);
        
        // Clean up cookies and URL on error
        document.cookie = 'wechat_user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'wechat_callback_url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('wechat_success');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");
    
    try {
      const response = await fetch('/api/proxy/core/api/login/', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          username,
          password,
          domain,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok || !responseData.result) {
        setFormError(responseData.message || "Login failed");
        setIsLoading(false);
        return;
      }
      
      const userData = responseData.data;
      setLoginData(userData);
      
      if (userData.temporary_pwd) {
        setAuthStep('reset-password');
        setIsLoading(false);
        return;
      }
      
      if (userData.enable_otp) {
        if (userData.qrcode) {
          try {
            const qrResponse = await fetch(`/api/proxy/core/api/generate_qr_code/?username=${encodeURIComponent(userData.username)}`, {
              method: "GET",
              headers: { 
                "Content-Type": "application/json" 
              },
            });
            const qrData = await qrResponse.json();
            if (qrResponse.ok && qrData.result) {
              setQrCodeUrl(qrData.data.qr_code);
            }
          } catch (error) {
            console.error("Failed to generate QR code:", error);
          }
        }
        setAuthStep('otp-verification');
        setIsLoading(false);
        return;
      }
      
      await completeAuthentication(userData);
      
    } catch (error) {
      console.error("Login error:", error);
      setFormError("An error occurred during login");
      setIsLoading(false);
    }
  };

  const handlePasswordResetComplete = async (updatedLoginData: LoginResponse) => {
    setLoginData(updatedLoginData);
    
    if (updatedLoginData.enable_otp) {
      if (updatedLoginData.qrcode) {
        try {
          const qrResponse = await fetch(`/api/proxy/core/api/generate_qr_code/?username=${encodeURIComponent(updatedLoginData.username || '')}`, {
            method: "GET",
            headers: { 
              "Content-Type": "application/json" 
            },
          });
          const qrData = await qrResponse.json();
          if (qrResponse.ok && qrData.result) {
            setQrCodeUrl(qrData.data.qr_code || qrData.data.qr_code_url);
          }
        } catch (error) {
          console.error("Failed to generate QR code:", error);
        }
      }
      setAuthStep('otp-verification');
      return;
    }
    
    await completeAuthentication(updatedLoginData);
  };

  const handleOtpVerificationComplete = async (loginData: LoginResponse) => {
    await completeAuthentication(loginData);
  };

  const completeAuthentication = async (userData: LoginResponse) => {
    try {
      const userDataForAuth = {
        id: userData.id || userData.username || 'unknown',
        username: userData.username,
        token: userData.token,
        locale: userData.locale || 'en',
        temporary_pwd: userData.temporary_pwd || false,
        enable_otp: userData.enable_otp || false,
        qrcode: userData.qrcode || false,
      };

      console.log('Completing authentication with user data:', userDataForAuth);

      if (userData.token) {
        saveAuthToken({
          id: userDataForAuth.id,
          username: userDataForAuth.username || '',
          token: userData.token,
          locale: userDataForAuth.locale,
          temporary_pwd: userDataForAuth.temporary_pwd,
          enable_otp: userDataForAuth.enable_otp,
          qrcode: userDataForAuth.qrcode,
        });
      }

      const result = await signIn("credentials", {
        redirect: false,
        username: userDataForAuth.username,
        password: password,
        skipValidation: 'true',
        userData: JSON.stringify(userDataForAuth),
        callbackUrl: callbackUrl || "/",
      });
      
      console.log('SignIn result:', result);
      
      if (result?.error) {
        console.error('SignIn error:', result.error);
        setFormError(result.error);
        setIsLoading(false);
      } else if (result?.ok) {
        if (userData.redirect_url) {
          console.log('Redirecting to server-provided redirect_url:', userData.redirect_url);
          window.location.href = userData.redirect_url;
        } else {
          console.log('SignIn successful, redirecting to:', callbackUrl || "/");
          window.location.href = callbackUrl || "/";
        }
      } else {
        console.error('SignIn failed with unknown error');
        setFormError("Authentication failed");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to complete authentication:", error);
      setFormError("Authentication failed");
      setIsLoading(false);
    }
  };

  const handleWechatSignIn = async () => {
    console.log("Starting WeChat login process...");
    setIsLoading(true);
    
    try {
      // Redirect to custom WeChat login start route
      const wechatLoginUrl = `/api/auth/wechat/start?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`;
      console.log("[WeChat Login] Redirecting to:", wechatLoginUrl);
      window.location.href = wechatLoginUrl;
      
    } catch (error) {
      console.error("Error initiating WeChat login:", error);
      setFormError("Failed to initiate WeChat login");
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="flex flex-col space-y-6 w-full">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="domain" className="text-sm font-medium text-gray-700">Domain</label>
          {loadingDomains && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>
        <Select
          id="domain"
          value={domain || undefined}
          onChange={setDomain}
          placeholder={loadingDomains ? 'Loading domains...' : 'Select a domain'}
          loading={loadingDomains}
          disabled={loadingDomains}
          className="w-full"
          size="middle"
          style={{ height: '48px' }}
          dropdownStyle={{ 
            borderRadius: '8px',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          options={domainList.map(domainItem => ({
            label: domainItem,
            value: domainItem,
          }))}
          notFoundContent={
            loadingDomains ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                Loading...
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-gray-500">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No domains available
              </div>
            )
          }
        />
        {!loadingDomains && domainList.length === 0 && (
          <p className="text-sm text-amber-600 flex items-center mt-1">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            No domains available
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
          required
        />
      </div>
      
      <button 
        type="submit" 
        disabled={isLoading}
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow transition-all duration-150 ease-in-out transform hover:-translate-y-0.5 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </span>
        ) : 'Sign In'}
      </button>
    </form>
  );

  const renderPasswordResetForm = () => (
    <PasswordResetForm
      username={username}
      loginData={loginData}
      onPasswordReset={handlePasswordResetComplete}
      onError={setFormError}
    />
  );

  const renderOtpVerificationForm = () => (
    <OtpVerificationForm
      username={username}
      loginData={loginData}
      qrCodeUrl={qrCodeUrl}
      onOtpVerification={handleOtpVerificationComplete}
      onError={setFormError}
    />
  );

  const renderWechatLoginSection = () => {
    if (wechatCheckLoading) {
      return (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Checking WeChat login...</span>
            </div>
          </div>
        </div>
      );
    }

    if (wechatAvailable === false) {
      return null;
    }

    return (
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleWechatSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting WeChat Login...
              </span>
            ) : (
              <span className="flex items-center">
                Sign in with WeChat
              </span>
            )}
          </button>
        </div>
        
        {isWechatBrowser && (
          <div className="mt-4 text-center text-sm text-green-600">
            You are using WeChat browser, for best experience use the WeChat login.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-[calc(100%+2rem)] h-screen -m-4">
      <div 
        className="w-3/5 hidden md:block bg-gradient-to-br from-blue-500 to-indigo-700"
        style={{
          backgroundImage: "url('/system-login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
      </div>
      
      <div className="w-full md:w-2/5 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Image src="/logo-site.png" alt="Logo" width={60} height={60} className="h-14 w-auto" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">
              {authStep === 'login' && 'Sign In'}
              {authStep === 'reset-password' && 'Reset Password'}
              {authStep === 'otp-verification' && 'Verify Identity'}
            </h2>
            <p className="text-gray-500 mt-2">
              {authStep === 'login' && 'Enter your credentials to continue'}
              {authStep === 'reset-password' && 'Create a new password to secure your account'}
              {authStep === 'otp-verification' && 'Complete the verification process'}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p className="font-medium">{signinErrors[error.toLowerCase()]}</p>
            </div>
          )}
          
          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p className="font-medium">{formError}</p>
            </div>
          )}
          
          {authStep === 'login' && renderLoginForm()}
          {authStep === 'reset-password' && renderPasswordResetForm()}
          {authStep === 'otp-verification' && renderOtpVerificationForm()}
          
          {authStep === 'login' && renderWechatLoginSection()}
        </div>
      </div>
    </div>
  );
}