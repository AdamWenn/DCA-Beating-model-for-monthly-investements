# -*- coding: utf-8 -*-
"""
Interaktivt ML Debug System med Jupyter-liknande funktionalitet
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from IPython.display import display
import warnings

def setup_plotting():
    """Konfigurera plotting för bättre visualisering."""
    plt.style.use('seaborn-v0_8')
    sns.set_palette("husl")
    plt.rcParams['figure.figsize'] = (12, 8)
    plt.rcParams['font.size'] = 10

class MLDebugger:
    """Avancerad ML debugging klass med visualisering och interaktiv analys."""
    
    def __init__(self, fred_api_key=None):
        self.fred_api_key = fred_api_key
        self.df_raw = None
        self.df_features = None
        self.df_labeled = None
        self.feature_cols = None
        
    def load_and_analyze_data(self, start_date="2000-01-01"):
        """Ladda data och skapa grundläggande analys."""
        from src.fetch_data import fetch_sp500_from_fred
        from src.features import build_feature_set
        from src.labels import make_std_labels
        from src.config import LABEL_HORIZON
        
        # Ladda rådata
        print("🔄 Laddar rådata från FRED...")
        self.df_raw = fetch_sp500_from_fred(start=start_date)
        
        # Bygg features
        print("🔄 Bygger features...")
        self.df_features = build_feature_set(self.df_raw)
        
        # Skapa labels
        print("🔄 Skapar labels...")
        self.df_labeled = make_std_labels(self.df_features, horizon=LABEL_HORIZON)
        
        # Definiera feature kolumner
        exclude = {"Date","Close","label","fwd_return","vol_h"}
        self.feature_cols = [c for c in self.df_labeled.columns if c not in exclude]
        
        print(f"✅ Data laddad: {self.df_labeled.shape}, {len(self.feature_cols)} features")
        
        return self
        
    def plot_data_overview(self):
        """Visualisera data overview."""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. S&P 500 pris över tid
        axes[0,0].plot(pd.to_datetime(self.df_raw['Date']), self.df_raw['Close'])
        axes[0,0].set_title('S&P 500 Pris Över Tid')
        axes[0,0].set_ylabel('Pris')
        axes[0,0].tick_params(axis='x', rotation=45)
        
        # 2. Label distribution
        label_counts = self.df_labeled['label'].value_counts()
        axes[0,1].bar(label_counts.index, label_counts.values)
        axes[0,1].set_title('Label Distribution')
        axes[0,1].set_xlabel('Label (0=Ned, 1=Upp)')
        axes[0,1].set_ylabel('Antal')
        
        # 3. NaN heatmap
        nan_data = self.df_labeled[self.feature_cols + ['label']].isnull()
        sns.heatmap(nan_data.iloc[::50], ax=axes[1,0], cbar=True, 
                   yticklabels=False, cmap='Reds')
        axes[1,0].set_title('NaN Mönster (varje 50:e rad)')
        
        # 4. Feature correlation heatmap (sample)
        corr_sample = self.df_labeled[self.feature_cols].dropna().corr()
        sns.heatmap(corr_sample, ax=axes[1,1], cmap='coolwarm', center=0,
                   square=True, cbar=True)
        axes[1,1].set_title('Feature Korrelationer')
        
        plt.tight_layout()
        plt.show()
        
    def analyze_features(self):
        """Djup analys av features med statistik och plottar."""
        print("="*50)
        print("FEATURE ANALYS")
        print("="*50)
        
        # Basic statistik
        feature_data = self.df_labeled[self.feature_cols]
        
        # Skapa feature statistik DataFrame
        stats = pd.DataFrame({
            'count': feature_data.count(),
            'mean': feature_data.mean(),
            'std': feature_data.std(),
            'min': feature_data.min(),
            'max': feature_data.max(),
            'nan_count': feature_data.isnull().sum(),
            'nan_pct': (feature_data.isnull().sum() / len(feature_data) * 100).round(2)
        })
        
        print("Feature Statistik:")
        display(stats)
        
        # Plot feature distributions
        n_features = len(self.feature_cols)
        n_cols = 4
        n_rows = (n_features + n_cols - 1) // n_cols
        
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(20, 5*n_rows))
        axes = axes.flatten() if n_rows > 1 else [axes] if n_cols == 1 else axes
        
        for i, col in enumerate(self.feature_cols):
            if i < len(axes):
                data = feature_data[col].dropna()
                axes[i].hist(data, bins=30, alpha=0.7)
                axes[i].set_title(f'{col}\n(μ={data.mean():.3f}, σ={data.std():.3f})')
                axes[i].grid(True, alpha=0.3)
        
        # Dölj onödiga subplots
        for i in range(len(self.feature_cols), len(axes)):
            axes[i].set_visible(False)
            
        plt.tight_layout()
        plt.show()
        
        return stats
        
    def debug_single_prediction(self, sample_size=1000):
        """Debug en enda ML-träning med visualisering."""
        from src.model import make_mlp_bagging, fit_predict
        
        print("="*50)
        print("SINGLE MODEL DEBUG")
        print("="*50)
        
        # Preparera data
        df_clean = self.df_labeled.dropna(subset=self.feature_cols+["label"])
        df_sample = df_clean.head(sample_size)
        
        X = df_sample[self.feature_cols].values
        y = df_sample["label"].values.astype(int)
        
        # Split
        split_idx = int(0.7 * len(X))
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        print(f"Train: {X_train.shape}, Test: {X_test.shape}")
        print(f"Train label dist: {np.bincount(y_train)}")
        print(f"Test label dist: {np.bincount(y_test)}")
        
        # Träna
        clf = make_mlp_bagging()
        y_pred, y_proba, trained_clf = fit_predict(clf, X_train, y_train, X_test)
        
        # Resultat
        accuracy = (y_pred == y_test).mean()
        
        # Visualisering
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # 1. Prediction distribution
        pred_counts = np.bincount(y_pred.astype(int))
        axes[0,0].bar(range(len(pred_counts)), pred_counts)
        axes[0,0].set_title(f'Predictions (Accuracy: {accuracy:.3f})')
        axes[0,0].set_xlabel('Predicted Class')
        
        # 2. Probability histogram
        axes[0,1].hist(y_proba, bins=30, alpha=0.7)
        axes[0,1].set_title('Prediction Probabilities')
        axes[0,1].set_xlabel('P(Class=1)')
        
        # 3. Confusion Matrix Visual
        from sklearn.metrics import confusion_matrix
        cm = confusion_matrix(y_test, y_pred)
        sns.heatmap(cm, annot=True, fmt='d', ax=axes[1,0], cmap='Blues')
        axes[1,0].set_title('Confusion Matrix')
        axes[1,0].set_xlabel('Predicted')
        axes[1,0].set_ylabel('Actual')
        
        # 4. Probability vs Actual
        df_results = pd.DataFrame({
            'actual': y_test,
            'proba': y_proba,
            'pred': y_pred
        })
        
        for actual_class in [0, 1]:
            class_data = df_results[df_results['actual'] == actual_class]
            axes[1,1].hist(class_data['proba'], alpha=0.6, 
                          label=f'Actual {actual_class}', bins=20)
        axes[1,1].legend()
        axes[1,1].set_title('Probability Distribution by Actual Class')
        axes[1,1].set_xlabel('P(Class=1)')
        
        plt.tight_layout()
        plt.show()
        
        return {
            'accuracy': accuracy,
            'model': trained_clf,
            'predictions': y_pred,
            'probabilities': y_proba,
            'test_data': (X_test, y_test)
        }
        
    def interactive_feature_exploration(self):
        """Interaktiv feature exploration (kräver widgets i Jupyter)."""
        try:
            import ipywidgets as widgets
            from IPython.display import display, clear_output
            
            def plot_feature(feature_name):
                clear_output(wait=True)
                
                fig, axes = plt.subplots(1, 3, figsize=(18, 6))
                
                # Time series
                data_clean = self.df_labeled.dropna(subset=[feature_name])
                axes[0].plot(range(len(data_clean)), data_clean[feature_name])
                axes[0].set_title(f'{feature_name} Time Series')
                
                # Distribution
                axes[1].hist(data_clean[feature_name], bins=30, alpha=0.7)
                axes[1].set_title(f'{feature_name} Distribution')
                
                # vs Label
                for label in [0, 1]:
                    label_data = data_clean[data_clean['label'] == label][feature_name]
                    axes[2].hist(label_data, alpha=0.6, label=f'Label {label}', bins=20)
                axes[2].legend()
                axes[2].set_title(f'{feature_name} by Label')
                
                plt.tight_layout()
                plt.show()
                
            # Skapa widget
            feature_dropdown = widgets.Dropdown(
                options=self.feature_cols,
                description='Feature:'
            )
            
            interactive_plot = widgets.interactive(plot_feature, feature_name=feature_dropdown)
            display(interactive_plot)
            
        except ImportError:
            print("⚠️ ipywidgets inte installerat. Kör 'pip install ipywidgets' för interaktiv funktionalitet")
            
    def generate_report(self):
        """Generera komplett HTML-rapport."""
        html_report = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>ML Trading System Debug Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background: #f0f0f0; padding: 20px; }}
                .section {{ margin: 20px 0; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ML Trading System Debug Report</h1>
                <p>Generated: {pd.Timestamp.now()}</p>
            </div>
            
            <div class="section">
                <h2>Data Overview</h2>
                <p>Raw data shape: {self.df_raw.shape}</p>
                <p>Final data shape: {self.df_labeled.shape}</p>
                <p>Number of features: {len(self.feature_cols)}</p>
                <p>Date range: {self.df_raw['Date'].min()} to {self.df_raw['Date'].max()}</p>
            </div>
            
            <div class="section">
                <h2>Label Distribution</h2>
                {self.df_labeled['label'].value_counts().to_frame().to_html()}
            </div>
            
            <div class="section">
                <h2>Feature Summary</h2>
                {self.df_labeled[self.feature_cols].describe().to_html()}
            </div>
        </body>
        </html>
        """
        
        with open('ml_debug_report.html', 'w') as f:
            f.write(html_report)
            
        print("✅ HTML-rapport sparad som 'ml_debug_report.html'")

def create_debug_notebook():
    """Skapa en Jupyter notebook för interaktiv debugging."""
    notebook_content = {
        "cells": [
            {
                "cell_type": "markdown",
                "source": ["# ML Trading System Debug Notebook\n", "Interaktiv debugging av ML trading system"]
            },
            {
                "cell_type": "code",
                "source": [
                    "import os\n",
                    "os.environ['FRED_API_KEY'] = '8d9ad11bf6016ba0a68f2f6f56f056ba'\n",
                    "\n",
                    "from debug_advanced import MLDebugger, setup_plotting\n",
                    "import warnings\n",
                    "warnings.filterwarnings('ignore')\n",
                    "\n",
                    "# Initiera debugger\n",
                    "debugger = MLDebugger()\n",
                    "setup_plotting()\n",
                    "\n",
                    "# Ladda data\n",
                    "debugger.load_and_analyze_data()"
                ]
            },
            {
                "cell_type": "code", 
                "source": ["# Visualisera data overview\n", "debugger.plot_data_overview()"]
            },
            {
                "cell_type": "code",
                "source": ["# Analysera features\n", "stats = debugger.analyze_features()"]
            },
            {
                "cell_type": "code",
                "source": ["# Debug single prediction\n", "results = debugger.debug_single_prediction()"]
            },
            {
                "cell_type": "code",
                "source": ["# Interaktiv feature exploration\n", "debugger.interactive_feature_exploration()"]
            }
        ]
    }
    
    import json
    with open('ml_debug.ipynb', 'w') as f:
        json.dump(notebook_content, f, indent=2)
        
    print("✅ Jupyter notebook skapad: 'ml_debug.ipynb'")

if __name__ == "__main__":
    print("🚀 Avancerat ML Debug System")
    print("Använd detta i Jupyter notebook för bästa upplevelse!")
    
    # Skapa notebook
    create_debug_notebook()
