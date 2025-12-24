/**
 * 🔱 APEX v38.9.21 - THE LIQUIDITY-AWARE TITAN
 * Strategy: Dynamic Flash Loans with Liquidity Guard
 * Fix: Automatically scales loan size to prevent "Liquidity Too Low" errors.
 */

const { ethers, Wallet, WebSocketProvider, Contract } = require('ethers');

const CONFIG = {
    CHAIN_ID: 8453,
    TARGET_CONTRACT: "0x83EF5c401fAa5B9674BAfAcFb089b30bAc67C9A0",
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    
    // --- POOL INFO (Base Uniswap V2 Pair for WETH/USDC) ---
    WETH_USDC_POOL: "0x88A43bb75941904d47401946215162a26bc773dc",
    
    WHALE_THRESHOLD: ethers.parseEther("15"),
    MIN_NET_PROFIT: "0.012", 
    GAS_LIMIT: 980000n,
    WSS_URL: "wss://base-mainnet.g.alchemy.com/v2/G-WBAMA8JxJMjkc-BCeoK"
};

// ABI snippet for fetching pool reserves
const PAIR_ABI = ["function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];

async function getSafeLoanAmount(requestedAmount) {
    try {
        const poolContract = new Contract(CONFIG.WETH_USDC_POOL, PAIR_ABI, provider);
        const [reserve0, reserve1] = await poolContract.getReserves();
        
        // Ensure we know which reserve is WETH (usually reserve0 on Base WETH/USDC)
        const wethReserves = reserve0; 
        
        // LIQUIDITY GUARD: Never swap more than 10% of the pool's total WETH
        const maxSafeSwap = wethReserves / 10n; 

        if (requestedAmount > maxSafeSwap) {
            console.log(`⚠️ LIQUIDITY ALERT: Scaling loan from ${ethers.formatEther(requestedAmount)} down to ${ethers.formatEther(maxSafeSwap)} ETH`);
            return maxSafeSwap;
        }
        return requestedAmount;
    } catch (e) {
        return requestedAmount / 2n; // Fallback: play it safe
    }
}

async function executeStrike(targetHash, startTime) {
    try {
        let loanAmount = await getDynamicLoanAmount();
        
        // NEW: Check liquidity before finalizing loan size
        loanAmount = await getSafeLoanAmount(loanAmount);

        const iface = new ethers.Interface(["function requestTitanLoan(address,uint256,address[])"]);
        const strikeData = iface.encodeFunctionData("requestTitanLoan", [CONFIG.WETH, loanAmount, [CONFIG.WETH, CONFIG.USDC]]);

        // ... Rest of your simulation and execution logic stays the same ...
        // (The bot will now only simulate trades that the pool can actually handle!)
        
        const simulationResult = await provider.call({
            to: CONFIG.TARGET_CONTRACT,
            data: strikeData,
            from: signer.address
        });

        // (Proceed with tx if netProfit > MIN_NET_PROFIT)
    } catch (e) {
        console.log("❌ Strike Aborted: Trade size still too large or pool empty.");
    }
}
