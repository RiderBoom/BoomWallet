import React, { useState, useEffect } from 'react';
import { Wallet, ArrowRightLeft, Heart, Settings, Shield, ExternalLink, RefreshCw, Copy, Check, AlertTriangle, Users, QrCode, TrendingUp, Download, Search, Coins } from 'lucide-react';

const UniversalTransferApp = () => {
  // --- State ---
  const [ethers, setEthers] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  
  // Contract Config
  // หาก Deploy แล้ว ให้ใส่ Address ของ Smart Contract ที่นี่เพื่อให้ผู้ใช้ไม่ต้องกรอกเอง
  const [contractAddress, setContractAddress] = useState(""); 
  
  // Tab State: 'transfer', 'deposit', 'market', 'donate', 'admin'
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

  // Market/Graph Data State
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [isChartLoading, setIsChartLoading] = useState(false);
  
  // Market Selection
  const [selectedCoin, setSelectedCoin] = useState("ethereum"); 
  const [coinInput, setCoinInput] = useState("");

  // Admin States
  const [newFee, setNewFee] = useState("");
  const [newTreasury, setNewTreasury] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // --- Initialize Ethers from CDN ---
  // สำหรับการรันในสภาพแวดล้อมที่ไม่มี Build process (เช่น Preview)
  // หากนำไป Build จริง แนะนำให้ใช้ `import { ethers } from 'ethers'` แทน
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
    script.async = true;
    script.onload = () => {
      if (window.ethers) {
        setEthers(window.ethers);
        console.log("Ethers.js loaded");
      }
    };
    document.body.appendChild(script);
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
      
      if (!response.ok) {
         throw new Error("Coin not found or API limit reached");
      }

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
      } else {
        setStatusMsg("ไม่พบข้อมูลกราฟสำหรับเหรียญนี้");
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
      setStatusMsg("ไม่พบเหรียญ '" + selectedCoin + "' (กรุณาใช้ Coin ID เช่น bitcoin)");
      setCurrentPrice(0);
      setPriceChange(0);
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

  // --- Helper: Simple SVG Line Chart ---
  const SimpleLineChart = ({ data, color = "#10b981" }) => {
    if (!data || data.length === 0) return null;

    const width = 600;
    const height = 200;
    const padding = 10;

    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((d.price - minPrice) / (maxPrice - minPrice)) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#374151" strokeWidth="1" strokeDasharray="4" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x={width - padding} y={height - padding - 5} fill="#9ca3af" fontSize="12" textAnchor="end">${minPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</text>
        <text x={width - padding} y={padding + 15} fill="#9ca3af" fontSize="12" textAnchor="end">${maxPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</text>
      </svg>
    );
  };

  // --- Functions ---

  const connectWallet = async () => {
    if (!ethers || !window.ethereum) {
      alert("กรุณาติดตั้ง MetaMask หรือรอให้ Ethers.js โหลดเสร็จ");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setNetwork(network.name);
      
      checkOwner(address, provider);

    } catch (error) {
      console.error(error);
      setStatusMsg("เชื่อมต่อกระเป๋าไม่สำเร็จ: " + error.message);
    }
  };

  const checkOwner = async (userAddress, provider) => {
    if (!contractAddress || !ethers.utils.isAddress(contractAddress)) return;
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const ownerAddress = await contract.owner();
      if (ownerAddress.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (e) {
      console.log("Not owner or contract invalid");
    }
  };

  const handleTransfer = async () => {
    if (!contractAddress) return alert("กรุณาระบุ Contract Address");
    setIsLoading(true);
    setStatusMsg("กำลังดำเนินการ...");

    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const refAddr = ethers.utils.isAddress(referrer) ? referrer : ethers.constants.AddressZero;

      if (transferType === "ETH") {
        const tx = await contract.transferETHWithReferral(recipient, refAddr, {
          value: ethers.utils.parseEther(amount)
        });
        setStatusMsg("รอการยืนยันธุรกรรม...");
        await tx.wait();
        setStatusMsg("โอน ETH สำเร็จ! ✅");
      } else {
        if (!tokenAddress) throw new Error("ระบุ Token Address");
        
        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.utils.parseUnits(amount, decimals);
        
        setStatusMsg("ตรวจสอบสิทธิ์ (Allowance)...");
        const allowance = await tokenContract.allowance(account, contractAddress);
        
        if (allowance.lt(amountWei)) {
            setStatusMsg("กำลังขออนุญาตใช้เหรียญ (Approve)...");
            const approveTx = await tokenContract.approve(contractAddress, ethers.constants.MaxUint256);
            await approveTx.wait();
        }

        setStatusMsg("กำลังโอน Token...");
        const tx = await contract.transferTokenWithReferral(tokenAddress, recipient, amountWei, refAddr);
        await tx.wait();
        setStatusMsg("โอน Token สำเร็จ! ✅");
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("เกิดข้อผิดพลาด: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!contractAddress) return alert("กรุณาระบุ Contract Address");
    setIsLoading(true);
    setStatusMsg("กำลังดำเนินการ...");
    
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      if (donateType === "ETH") {
        // Donate ETH
        const tx = await contract.donateETH({ value: ethers.utils.parseEther(amount) });
        setStatusMsg("รอการยืนยันการบริจาค...");
        await tx.wait();
      } else {
        // Donate Token
        if (!donateTokenAddress) throw new Error("ระบุ Token Address ที่ต้องการบริจาค");
        
        const tokenContract = new ethers.Contract(donateTokenAddress, erc20ABI, signer);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.utils.parseUnits(amount, decimals);

        setStatusMsg("ตรวจสอบสิทธิ์ (Allowance)...");
        const allowance = await tokenContract.allowance(account, contractAddress);
        
        if (allowance.lt(amountWei)) {
            setStatusMsg("กำลังขออนุญาตใช้เหรียญ (Approve)...");
            const approveTx = await tokenContract.approve(contractAddress, ethers.constants.MaxUint256);
            await approveTx.wait();
        }

        setStatusMsg("กำลังส่ง Token บริจาค...");
        const tx = await contract.donateToken(donateTokenAddress, amountWei);
        await tx.wait();
      }

      setStatusMsg("ขอบคุณสำหรับการบริจาค! 🙏");
      setAmount(""); // Clear amount
    } catch (error) {
      console.error(error);
      setStatusMsg("บริจาคไม่สำเร็จ: " + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    if (!contractAddress) return;
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.setFeeBps(newFee);
      await tx.wait();
      setStatusMsg("อัปเดตค่าธรรมเนียมเรียบร้อย");
    } catch (error) {
      setStatusMsg("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("คัดลอกเรียบร้อยแล้ว: " + text);
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
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex bg-slate-900 p-1 rounded-lg w-fit">
                  <button 
                    onClick={() => setTransferType('ETH')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${transferType === 'ETH' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Native ETH
                  </button>
                  <button 
                    onClick={() => setTransferType('ERC20')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${transferType === 'ERC20' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    ERC-20 Token
                  </button>
                </div>

                {transferType === 'ERC20' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Token Address</label>
                    <input 
                      type="text" 
                      placeholder="0x..." 
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-purple-500 outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ผู้รับ (Recipient Address)</label>
                    <input 
                      type="text" 
                      placeholder="0x..." 
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">จำนวน (Amount)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white focus:border-blue-500 outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-bold">{transferType === 'ETH' ? 'ETH' : 'TOKENS'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                   <div className="flex items-center gap-2 mb-2 text-sm text-emerald-400">
                      <Users className="w-4 h-4" />
                      <span>ระบบ Affiliate (Optional)</span>
                   </div>
                   <input 
                      type="text" 
                      placeholder="Address ผู้แนะนำ (Referrer) - ถ้ามี" 
                      value={referrer}
                      onChange={(e) => setReferrer(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    />
                </div>

                <button 
                  onClick={handleTransfer}
                  disabled={isLoading || !recipient || !amount}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                  {transferType === 'ERC20' ? 'Approve & Transfer' : 'ยืนยันการโอน'}
                </button>
              </div>
            )}

            {/* --- Deposit Tab --- */}
            {activeTab === 'deposit' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-in fade-in zoom-in duration-300">
                <h2 className="text-xl font-bold text-white mb-2">รับเงินฝาก (Deposit)</h2>
                
                {account ? (
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    {/* QR Code using API */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${account}`} 
                      alt="Wallet QR" 
                      className="w-48 h-48 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-500 border border-dashed border-slate-600">
                    <p>กรุณาเชื่อมต่อกระเป๋า</p>
                  </div>
                )}

                <div className="w-full max-w-md bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-2">
                  <span className="text-sm text-slate-400">Wallet Address ของคุณ</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-emerald-400 break-all bg-slate-950/50 p-2 rounded border border-slate-800">
                      {account || "ยังไม่เชื่อมต่อ"}
                    </code>
                    <button 
                      onClick={() => account && copyToClipboard(account)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                      title="คัดลอก"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl max-w-md text-sm text-yellow-200/80 flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>โปรดตรวจสอบเครือข่าย (Network) ให้ถูกต้องก่อนโอนเหรียญ รองรับเฉพาะ ETH และ ERC-20 Token เท่านั้น</p>
                </div>
              </div>
            )}

            {/* --- Market Tab --- */}
            {activeTab === 'market' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col gap-4">
                  <form onSubmit={handleSearchCoin} className="relative w-full">
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อเหรียญ (เช่น bitcoin, solana)..." 
                      value={coinInput}
                      onChange={(e) => setCoinInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                    />
                    <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                    <button type="submit" className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                      ค้นหา
                    </button>
                  </form>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['bitcoin', 'ethereum', 'solana', 'dogecoin', 'ripple', 'cardano'].map(coin => (
                      <button 
                        key={coin}
                        onClick={() => setSelectedCoin(coin)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${selectedCoin === coin ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'}`}
                      >
                        {coin.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 capitalize">
                      <img 
                        src={`https://cryptologos.cc/logos/${selectedCoin === 'ethereum' ? 'ethereum-eth' : selectedCoin === 'bitcoin' ? 'bitcoin-btc' : selectedCoin === 'solana' ? 'solana-sol' : selectedCoin === 'dogecoin' ? 'dogecoin-doge' : selectedCoin}-logo.png`} 
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/64px-Bitcoin.svg.png"; e.target.style.opacity = '0.5'; }}
                        className="w-8 h-8 rounded-full bg-white/10 p-0.5" 
                        alt={selectedCoin} 
                      />
                      {selectedCoin}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">ราคาปัจจุบัน (Real-time)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white tracking-tight">${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
                    <div className={`text-sm font-medium flex items-center justify-end gap-1 ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingUp className="w-4 h-4 rotate-180"/>}
                      {priceChange.toFixed(2)}% (24h)
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 h-[300px] flex items-center justify-center relative">
                  {isChartLoading ? (
                    <div className="flex flex-col items-center text-slate-500 animate-pulse">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                      กำลังโหลดข้อมูล...
                    </div>
                  ) : chartData.length > 0 ? (
                    <SimpleLineChart data={chartData} color={priceChange >= 0 ? "#10b981" : "#ef4444"} />
                  ) : (
                    <div className="text-slate-500 text-sm">ไม่พบข้อมูลกราฟ</div>
                  )}
                </div>
              </div>
            )}

            {/* --- Donate Tab (Updated) --- */}
            {activeTab === 'donate' && (
              <div className="space-y-6 text-center py-8 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-pink-500" />
                </div>
                <h2 className="text-xl font-bold text-white">สนับสนุนโปรเจกต์ (Donation)</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                  เงินบริจาคจะถูกส่งเข้า Treasury โดยตรง เพื่อใช้ในการพัฒนาและบำรุงรักษาระบบต่อไป
                </p>
                
                {/* Donation Type Selector */}
                <div className="flex justify-center gap-4 mb-6">
                  <button 
                    onClick={() => setDonateType("ETH")}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${donateType === 'ETH' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'}`}
                  >
                    <Wallet className="w-4 h-4" /> ETH
                  </button>
                  <button 
                    onClick={() => setDonateType("ERC20")}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${donateType === 'ERC20' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'}`}
                  >
                    <Coins className="w-4 h-4" /> Token
                  </button>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  {donateType === 'ERC20' && (
                    <div className="text-left">
                      <label className="text-xs text-slate-400 ml-1">Token Address</label>
                      <input 
                        type="text" 
                        placeholder="0x..." 
                        value={donateTokenAddress}
                        onChange={(e) => setDonateTokenAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-purple-500 outline-none transition-colors"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-center text-lg outline-none transition-colors ${donateType === 'ETH' ? 'focus:border-pink-500' : 'focus:border-purple-500'}`}
                    />
                    <span className="absolute right-4 top-4 text-slate-500 text-sm font-bold">{donateType === 'ETH' ? 'ETH' : 'TOKENS'}</span>
                  </div>

                  {/* Quick Amount Buttons (ETH Only) */}
                  {donateType === 'ETH' && (
                    <div className="flex gap-2 justify-center">
                      {[0.01, 0.05, 0.1, 0.5].map((val) => (
                        <button 
                          key={val}
                          onClick={() => setAmount(val.toString())}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                        >
                          {val} ETH
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleDonate}
                  disabled={isLoading || !amount || (donateType === 'ERC20' && !donateTokenAddress)}
                  className={`w-full max-w-sm mx-auto text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${donateType === 'ETH' ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-900/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20'}`}
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Heart className="w-5 h-5 fill-current" />}
                  {isLoading ? "กำลังดำเนินการ..." : `ยืนยันบริจาค ${donateType}`}
                </button>
              </div>
            )}

            {/* --- Admin Tab --- */}
            {activeTab === 'admin' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-yellow-500">Admin Zone</h3>
                    <p className="text-sm text-yellow-200/70">สำหรับเจ้าของสัญญาเท่านั้น ระวังการปรับค่าต่างๆ</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">ค่าธรรมเนียมใหม่ (BPS)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="20 (=0.2%)" 
                        value={newFee}
                        onChange={(e) => setNewFee(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button onClick={handleUpdateFee} className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg text-sm">บันทึก</button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">เปลี่ยน Treasury Wallet</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="0x..." 
                        value={newTreasury}
                        onChange={(e) => setNewTreasury(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                      <button className="bg-slate-700 hover:bg-slate-600 px-4 rounded-lg text-sm">บันทึก</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Message */}
            {statusMsg && (
              <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-700 text-center animate-pulse">
                <span className="text-blue-400 font-medium">{statusMsg}</span>
              </div>
            )}

          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Powered by BoomTech Universal Transfer Protocol
        </div>
      </div>
    </div>
  );
};

export default App;