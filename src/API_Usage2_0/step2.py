import pandas as pnd


def read_csv(file_path: str = "signals.csv") -> pnd.DataFrame:
    df = pnd.read_csv(file_path)
    df["Date"] = pnd.to_datetime(df["Date"], errors="raise")  # Ensure Date column uses datetime objects
    return df


if __name__ == "__main__":
    df_signals = read_csv("signals.csv")
    print(df_signals.tail())
    print(df_signals.dtypes)
    print(df_signals["Date"].max())
    print(df_signals["Date"].min())

    # Initialize columns for calculated values
    df_signals["Equity Value"] = 0.0
    df_signals["DCA Value"] = 0.0
    
    # Equity calculation, with new capital 10 th on each month
    has_gotten_capital_this_month = False
    equity = 0.0
    DCA_counter_example_shares = 0.0
    shares = 0.0
    
    for idx, row in df_signals.iterrows():
        # Temp debug, if date is 2025-04-17
        if row["Date"] == pnd.to_datetime("2025-04-17"):
            print("Date is 2025-04-17")
        # 10th of each month or later that month if 10th is not trading day
        if row["Date"].day >= 10:
            if not has_gotten_capital_this_month:
                equity += 1000.0
                has_gotten_capital_this_month = True
                # DCA
                DCA_counter_example_shares += 1000.0 / row["Close"]
        # Reset at start of new month  
        if row["Date"].day <= 10:
            has_gotten_capital_this_month = False
        
        if row["Signal"] == "Buy":
            new_shares = equity / row["Close"]
            shares += new_shares
            equity -= new_shares * row["Close"]

        # Calculate value of shares at current close price
        equity_value = equity + shares * row["Close"]
        dca_value = DCA_counter_example_shares * row["Close"]
        
        # Store values directly in DataFrame
        df_signals.at[idx, "Equity Value"] = equity_value
        df_signals.at[idx, "DCA Value"] = dca_value
        
        print(f"{row['Date']}: Equity value: {equity_value:.2f}, DCA value: {dca_value:.2f}, Signal: {row['Signal']}, TN_TP_FP_FN: {row['TN_TP_FP_FN']}")
    
    print(f"Final equity value: {equity + shares * row['Close']:.2f}, Final DCA value: {DCA_counter_example_shares * row['Close']:.2f}")

    # Plot equity_value and dca_value over time, close prices, and signals
    import matplotlib.pyplot as plt

    fig, ax1 = plt.subplots(figsize=(14, 7))
    
    # Plot equity and DCA values on primary Y-axis
    ax1.plot(df_signals["Date"], df_signals["Equity Value"], label="Equity Value", alpha=0.7, color='blue')
    ax1.plot(df_signals["Date"], df_signals["DCA Value"], label="DCA Value", alpha=0.7, color='orange')
    ax1.set_xlabel("Date")
    ax1.set_ylabel("Portfolio Value ($)", color='black')
    ax1.legend(loc='upper left')
    
    # Create secondary Y-axis for close prices
    ax2 = ax1.twinx()
    ax2.plot(df_signals["Date"], df_signals["Close"], label="Close Price", alpha=0.5, color='gray')
    ax2.scatter(df_signals["Date"], df_signals["Close"], c=df_signals["Signal"].map({"Buy": "green", "Hold": "red"}), label="Signals", s=20)
    ax2.set_ylabel("Stock Price ($)", color='gray')
    ax2.legend(loc='upper right')
    
    plt.title("Equity and DCA Value Over Time with Stock Price")
    plt.tight_layout()
    plt.show()
