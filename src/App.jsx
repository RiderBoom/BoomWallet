import React, { useState, useEffect } from 'react';
// import { ethers } from 'ethers'; // ปิดไว้เพื่อป้องกัน Error ในหน้า Preview
import { Wallet, ArrowRightLeft, Heart, Settings, Shield, ExternalLink, RefreshCw, Copy, Check, AlertTriangle, Users, QrCode, TrendingUp, Download, Search, Coins } from 'lucide-react';

const App = () => {
  // --- State ---
  const [ethersLib, setEthersLib] = useState(null); // เก็บไลบรารี ethers
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  
  // Contract Config: ใส่ Address ของ Smart Contract ที่ Deploy แล้วตรงนี้
  const [contractAddress, setContractAddress] = useState("0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B"); 
  
  // Tab State
  const [activeTab, setActiveTab] = useState("transfer");

  // Form States
  const [transferType, setTransferType] = useState("ETH");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [referrer, setReferrer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Donation States
  const [donateType, setDonateType] = useState("ETH");
  const [donateTokenAddress, setDonateTokenAddress] = useState("");

  // Market Data State
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState("ethereum"); 
  const [coinInput, setCoinInput] = useState("");

  // Admin States
  const [newFee, setNewFee] = useState("");
  const [newTreasury, setNewTreasury] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // --- Initialize Ethers (Universal Loader) ---
  useEffect(() => {
    const loadEthers = async () => {
      // 1. ลองเช็คว่ามี ethers ใน window หรือยัง (กรณี npm install)
      if (window.ethers) {
        setEthersLib(window.ethers);
        return;
      }

      // 2. ถ้าไม่มี ให้โหลดผ่าน CDN (สำหรับ Preview หรือไม่ได้ npm install)
      try {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
        script.async = true;
        script.onload = () => {
          if (window.ethers) {
            setEthersLib(window.ethers);
            console.log("Ethers.js loaded via CDN");
          }
        };
        script.onerror = () => {
            console.error("Failed to load ethers.js");
            setStatusMsg("Error: ไม่สามารถโหลดไลบรารี Ethers.js ได้");
        };
        document.body.appendChild(script);
      } catch (e) {
        console.error(e);
      }
    };

    loadEthers();
  }, []);

  // --- Contract ABI ---
  const contractABI = [
    "function transferETHWithReferral(address payable to, address referrer) external payable",
    "function transferTokenWithReferral(address token, address to, uint256 amount, address referrer) external",
    "function donateETH() external payable",
    "function donateToken(address token, uint256 amount) external",
    "function owner() view returns (address)",
    "function setFeeBps(uint256 newFeeBps) external",
    "function setTreasury(address newTreasury) external",
    "function feeBps() view returns (uint256)",
    "function rescueETH(uint256 amount) external"
  ];

  const erc20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  // --- Market Data Fetching ---
  const fetchMarketData = async () => {
    setIsChartLoading(true);
    setChartData([]); 
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoin}/market_chart?vs_currency=usd&days=1`);
      
      if (!response.ok) throw new Error("API Error");

      const data = await response.json();
      
      if (data.prices && data.prices.length > 0) {
        const formattedData = data.prices.map(item => ({
          time: item[0],
          price: item[1]
        }));
        setChartData(formattedData);
        
        const latestPrice = formattedData[formattedData.length - 1].price;
        const startPrice = formattedData[0].price;
        setCurrentPrice(latestPrice);
        setPriceChange(((latestPrice - startPrice) / startPrice) * 100);
        setStatusMsg("");
      }
    } catch (error) {
      console.error("Market data error:", error);
      setStatusMsg(`ดึงข้อมูลกราฟ ${selectedCoin} ไม่สำเร็จ`);
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 60000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedCoin]);

  const handleSearchCoin = (e) => {
    e.preventDefault();
    if (coinInput.trim()) {
      setSelectedCoin(coinInput.toLowerCase().trim());
      setCoinInput("");
    }
  };

  // --- Helper: Simple SVG Chart ---
  const SimpleLineChart = ({ data, color = "#10b981" }) => {
    if (!data || data.length === 0) return null;
    const width = 600;
    const height = 200;
    const padding = 10;
    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    
    if (maxPrice === minPrice) return null; // ป้องกันการหารด้วยศูนย์

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((d.price - minPrice) / (maxPrice - minPrice)) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // --- Wallet Functions ---
  const connectWallet = async () => {
    if (!ethersLib && !window.ethereum) {
      alert("กรุณาติดตั้ง MetaMask และรอสักครู่ให้ระบบโหลด");
      return;
    }

    try {
      // ใช้ ethersLib ที่โหลดมาจาก State
      const provider = new ethersLib.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setNetwork(network.name);
      
      checkOwner(address, provider, ethersLib);

    } catch (error) {
      console.error(error);
      setStatusMsg("Connection Error: " + error.message);
    }
  };

  const checkOwner = async (userAddress, provider, lib) => {
    if (!contractAddress || !lib.utils.isAddress(contractAddress)) return;
    try {
      const contract = new lib.Contract(contractAddress, contractABI, provider);
      const ownerAddress = await contract.owner();
      if (ownerAddress.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (e) { console.log("Not owner"); }
  };

  const handleTransfer = async () => {
    if (!contractAddress) return alert("กรุณาระบุ Contract Address");
    setIsLoading(true);
    setStatusMsg("กำลังดำเนินการ...");

    try {
      const contract = new ethersLib.Contract(contractAddress, contractABI, signer);
      const refAddr = ethersLib.utils.isAddress(referrer) ? referrer : ethersLib.constants.AddressZero;

      if (transferType === "ETH") {
        const tx = await contract.transferETHWithReferral(recipient, refAddr, {
          value: ethersLib.utils.parseEther(amount)
        });
        await tx.wait();
        setStatusMsg("โอน ETH สำเร็จ! ✅");
      } else {
        if (!tokenAddress) throw new Error("ระบุ Token Address");
        const tokenContract = new ethersLib.Contract(tokenAddress, erc20ABI, signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethersLib.utils.parseUnits(amount, decimals);
        
        setStatusMsg("ตรวจสอบสิทธิ์...");
        const allowance = await tokenContract.allowance(account, contractAddress);
        if (allowance.lt(amountWei)) {
            setStatusMsg("Approve เหรียญ...");
            const approveTx = await tokenContract.approve(contractAddress, ethersLib.constants.MaxUint256);
            await approveTx.wait();
        }

        setStatusMsg("กำลังโอน...");
        const tx = await contract.transferTokenWithReferral(tokenAddress, recipient, amountWei, refAddr);
        await tx.wait();
        setStatusMsg("โอน Token สำเร็จ! ✅");
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!contractAddress) return alert("กรุณาระบุ Contract Address");
    setIsLoading(true);
    setStatusMsg("กำลังบริจาค...");
    try {
      const contract = new ethersLib.Contract(contractAddress, contractABI, signer);
      if (donateType === "ETH") {
        const tx = await contract.donateETH({ value: ethersLib.utils.parseEther(amount) });
        await tx.wait();
      } else {
        if (!donateTokenAddress) throw new Error("ระบุ Token Address");
        const tokenContract = new ethersLib.Contract(donateTokenAddress, erc20ABI, signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethersLib.utils.parseUnits(amount, decimals);
        
        const allowance = await tokenContract.allowance(account, contractAddress);
        if (allowance.lt(amountWei)) {
            const approveTx = await tokenContract.approve(contractAddress, ethersLib.constants.MaxUint256);
            await approveTx.wait();
        }
        const tx = await contract.donateToken(donateTokenAddress, amountWei);
        await tx.wait();
      }
      setStatusMsg("ขอบคุณสำหรับการบริจาค! 🙏");
      setAmount("");
    } catch (error) {
      setStatusMsg("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    setIsLoading(true);
    try {
      const contract = new ethersLib.Contract(contractAddress, contractABI, signer);
      const tx = await contract.setFeeBps(newFee);
      await tx.wait();
      setStatusMsg("อัปเดตเรียบร้อย");
    } catch (error) { setStatusMsg("Error: " + error.message); } finally { setIsLoading(false); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("คัดลอก: " + text);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="bg-blue-600 p-3 rounded-xl">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                BoomTech Gateway
              </h1>
              <p className="text-slate-400 text-sm">Universal Transfer & Affiliate System</p>
            </div>
          </div>
          
          <button
            onClick={connectWallet}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
              account 
                ? "bg-slate-700 text-emerald-400 border border-emerald-500/30" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/20"
            }`}
          >
            {account ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {account.slice(0,6)}...{account.slice(-4)}
              </>
            ) : "เชื่อมต่อกระเป๋า (Connect)"}
          </button>
        </div>

        {/* Contract Setup */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-400 mb-1 block">Smart Contract Address (UniversalTransfer)</label>
            <input 
              type="text" 
              placeholder="0x..." 
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 font-mono text-sm focus:border-blue-500 outline-none"
            />
          </div>
          {account && contractAddress && isOwner && (
            <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg border border-yellow-500/20 text-xs font-bold flex items-center gap-1">
              <Shield className="w-3 h-3" /> ADMIN
            </div>
          )}
        </div>

        {/* Main Interface */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('transfer')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'transfer' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ArrowRightLeft className="w-4 h-4" /> โอนเงิน
            </button>
            <button 
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'deposit' ? 'bg-slate-700/50 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <QrCode className="w-4 h-4" /> รับเงิน (Deposit)
            </button>
            <button 
              onClick={() => setActiveTab('market')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'market' ? 'bg-slate-700/50 text-orange-400 border-b-2 border-orange-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <TrendingUp className="w-4 h-4" /> กราฟ (Market)
            </button>
            <button 
              onClick={() => setActiveTab('donate')}
              className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'donate' ? 'bg-slate-700/50 text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Heart className="w-4 h-4" /> บริจาค
            </button>
            {isOwner && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-slate-700/50 text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Settings className="w-4 h-4" /> Admin
              </button>
            )}
          </div>

          <div className="p-6 md:p-8">
            
            {/* --- Transfer Tab --- */}
            {activeTab === 'transfer' && (
              <div className="space-y-6">
                <div className="flex bg-slate-900 p-1 rounded-lg w-fit">
                  <button onClick={() => setTransferType('ETH')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${transferType === 'ETH' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Native ETH</button>
                  <button onClick={() => setTransferType('ERC20')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${transferType === 'ERC20' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>ERC-20 Token</button>
                </div>

                {transferType === 'ERC20' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Token Address</label>
                    <input type="text" placeholder="0x..." value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-purple-500 outline-none" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ผู้รับ (Recipient)</label>
                    <input type="text" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">จำนวน (Amount)</label>
                    <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-blue-500 outline-none" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                   <div className="flex items-center gap-2 mb-2 text-sm text-emerald-400"><Users className="w-4 h-4" /><span>ระบบ Affiliate (Optional)</span></div>
                   <input type="text" placeholder="Address ผู้แนะนำ (Referrer)" value={referrer} onChange={(e) => setReferrer(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 outline-none" />
                </div>

                <button onClick={handleTransfer} disabled={isLoading || !recipient || !amount} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                  {transferType === 'ERC20' ? 'Approve & Transfer' : 'ยืนยันการโอน'}
                </button>
              </div>
            )}

            {/* --- Deposit Tab --- */}
            {activeTab === 'deposit' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <h2 className="text-xl font-bold text-white mb-2">รับเงินฝาก (Deposit)</h2>
                {account ? (
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${account}`} alt="Wallet QR" className="w-48 h-48 rounded-lg" />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-500 border border-dashed border-slate-600"><p>กรุณาเชื่อมต่อกระเป๋า</p></div>
                )}
                <div className="w-full max-w-md bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-2">
                  <span className="text-sm text-slate-400">Wallet Address ของคุณ</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-emerald-400 break-all bg-slate-950/50 p-2 rounded border border-slate-800">{account || "ยังไม่เชื่อมต่อ"}</code>
                    <button onClick={() => account && copyToClipboard(account)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* --- Market Tab --- */}
            {activeTab === 'market' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <form onSubmit={handleSearchCoin} className="relative w-full">
                    <input type="text" placeholder="ค้นหาชื่อเหรียญ (เช่น bitcoin)..." value={coinInput} onChange={(e) => setCoinInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none" />
                    <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                    <button type="submit" className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium">ค้นหา</button>
                  </form>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['bitcoin', 'ethereum', 'solana', 'dogecoin', 'ripple'].map(coin => (
                      <button key={coin} onClick={() => setSelectedCoin(coin)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedCoin === coin ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{coin.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 capitalize">{selectedCoin}</h2>
                    <p className="text-slate-400 text-sm mt-1">ราคาปัจจุบัน (Real-time)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white tracking-tight">${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <div className={`text-sm font-medium flex items-center justify-end gap-1 ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{priceChange >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingUp className="w-4 h-4 rotate-180"/>}{priceChange.toFixed(2)}% (24h)</div>
                  </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 h-[300px] flex items-center justify-center relative">
                  {isChartLoading ? <div className="text-slate-500 animate-pulse">กำลังโหลดข้อมูล...</div> : chartData.length > 0 ? <SimpleLineChart data={chartData} color={priceChange >= 0 ? "#10b981" : "#ef4444"} /> : <div className="text-slate-500 text-sm">ไม่พบข้อมูลกราฟ</div>}
                </div>
              </div>
            )}

            {/* --- Donate Tab --- */}
            {activeTab === 'donate' && (
              <div className="space-y-6 text-center py-8">
                <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Heart className="w-10 h-10 text-pink-500" /></div>
                <h2 className="text-xl font-bold text-white">สนับสนุนโปรเจกต์ (Donation)</h2>
                
                <div className="flex justify-center gap-4 mb-6">
                  <button onClick={() => setDonateType("ETH")} className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${donateType === 'ETH' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><Wallet className="w-4 h-4" /> ETH</button>
                  <button onClick={() => setDonateType("ERC20")} className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${donateType === 'ERC20' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><Coins className="w-4 h-4" /> Token</button>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  {donateType === 'ERC20' && (
                    <input type="text" placeholder="Token Address (0x...)" value={donateTokenAddress} onChange={(e) => setDonateTokenAddress(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-purple-500 outline-none" />
                  )}
                  <div className="relative">
                    <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-center text-lg outline-none ${donateType === 'ETH' ? 'focus:border-pink-500' : 'focus:border-purple-500'}`} />
                    <span className="absolute right-4 top-4 text-slate-500 text-sm font-bold">{donateType === 'ETH' ? 'ETH' : 'TOKENS'}</span>
                  </div>
                  {donateType === 'ETH' && (
                    <div className="flex gap-2 justify-center">
                      {[0.01, 0.05, 0.1].map((val) => <button key={val} onClick={() => setAmount(val.toString())} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700">{val} ETH</button>)}
                    </div>
                  )}
                </div>

                <button onClick={handleDonate} disabled={isLoading || !amount} className={`w-full max-w-sm mx-auto text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${donateType === 'ETH' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Heart className="w-5 h-5 fill-current" />} {isLoading ? "กำลังดำเนินการ..." : `ยืนยันบริจาค ${donateType}`}
                </button>
              </div>
            )}

            {/* --- Admin Tab --- */}
            {activeTab === 'admin' && (
              <div className="space-y-6">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div><h3 className="font-bold text-yellow-500">Admin Zone</h3><p className="text-sm text-yellow-200/70">สำหรับเจ้าของสัญญาเท่านั้น</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">ค่าธรรมเนียมใหม่ (BPS)</label>
                    <div className="flex gap-2"><input type="number" placeholder="20" value={newFee} onChange={(e) => setNewFee(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" /><button onClick={handleUpdateFee} className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg text-sm">บันทึก</button></div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">เปลี่ยน Treasury Wallet</label>
                    <div className="flex gap-2"><input type="text" placeholder="0x..." value={newTreasury} onChange={(e) => setNewTreasury(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white" /><button className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg text-sm">บันทึก</button></div>
                  </div>
                </div>
              </div>
            )}

            {statusMsg && (
              <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-700 text-center animate-pulse">
                <span className="text-blue-400 font-medium">{statusMsg}</span>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;