# -*- coding: utf-8 -*-
"""
Classifier: BalancedBaggingClassifier med MLP-basestimator.
Förbehandling: MinMaxScaler. MLP: en dold lagerstorlek = 4 * (#features), ReLU i dolda lager, alpha=0.001.
Sklearn använder logistisk/sigmoid output för binär klass -> vi använder predict_proba[:,1] som sannolikhet för klass 1.
"""
import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier
from imblearn.ensemble import BalancedBaggingClassifier

class CustomThresholdBaggingClassifier(BalancedBaggingClassifier):
    """
    BalancedBaggingClassifier som stöder anpassad decision threshold.
    """
    def __init__(self, estimator=None, decision_threshold=0.5, **kwargs):
        super().__init__(estimator=estimator, **kwargs)
        self.decision_threshold = decision_threshold
    
    def predict(self, X):
        """
        Använd anpassad threshold istället för majority voting.
        """
        if self.decision_threshold == 0.5:
            # Använd standard prediction för 0.5 threshold
            return super().predict(X)
        else:
            # Använd anpassad threshold på ensemble probabilities
            y_proba = self.predict_proba(X)[:, 1]
            return (y_proba >= self.decision_threshold).astype(int)

class DynamicMLP(BaseEstimator, ClassifierMixin):
    """
    Skapar en MLPClassifier där dolda lagrets storlek sätts till 4x antalet features vid fit().
    Stöder anpassad decision threshold istället för sklearn's standard 0.5.
    """
    def __init__(self, alpha=0.001, random_state=None, decision_threshold=0.5):
        self.alpha = alpha
        self.random_state = random_state
        self.decision_threshold = decision_threshold
        self.model_ = None

    def fit(self, X, y):
        n_features = X.shape[1]
        hidden = (max(4, 4 * n_features),)
        mlp = MLPClassifier(hidden_layer_sizes=hidden, activation="relu",
                            alpha=self.alpha, max_iter=400, random_state=self.random_state)
        pipe = Pipeline([
            ("scaler", MinMaxScaler()),
            ("mlp", mlp)
        ])
        self.model_ = pipe.fit(X, y)
        self.classes_ = self.model_.classes_
        return self

    def predict(self, X):
        """
        Gör förutsägelser med anpassad decision threshold istället för sklearn's 0.5.
        """
        if self.decision_threshold == 0.5:
            # Använd sklearn's standard predict() för 0.5 threshold
            return self.model_.predict(X)
        else:
            # Använd anpassad threshold med predict_proba
            y_proba = self.model_.predict_proba(X)[:, 1]
            return (y_proba >= self.decision_threshold).astype(int)

    def predict_proba(self, X):
        # MLPClassifier ger proba via logistic/softmax i output
        return self.model_.predict_proba(X)

def make_baseline():
    return DummyClassifier(strategy="most_frequent")

def make_mlp_bagging(decision_threshold=0.5):
    """
    Skapar CustomThresholdBaggingClassifier med DynamicMLP och anpassad decision threshold.
    
    Args:
        decision_threshold (float): Tröskelvärde för binär klassificering (default: 0.5)
    """
    base = DynamicMLP(alpha=0.001)  # Remove threshold from base estimator
    clf = CustomThresholdBaggingClassifier(
        estimator=base,
        decision_threshold=decision_threshold,
        n_estimators=9,
        sampling_strategy="auto",
        bootstrap=True,
        n_jobs=1  # Use single job to avoid pickle issues with custom classes
    )
    return clf

def fit_predict(clf, X_train, y_train, X_test, debug=False):
    """
    Tränar klassificerare och gör förutsägelser med stöd för anpassad threshold.
    
    Args:
        debug (bool): Om True, returnera extra debug-information
    """
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    try:
        y_proba = clf.predict_proba(X_test)[:, 1]
    except Exception:
        y_proba = np.zeros(len(y_pred))
    
    if debug:
        # Extra information för debugging
        debug_info = {
            'threshold_used': getattr(clf, 'decision_threshold', 0.5),
            'proba_stats': {
                'min': float(np.min(y_proba)),
                'max': float(np.max(y_proba)),
                'mean': float(np.mean(y_proba)),
                'std': float(np.std(y_proba))
            },
            'pred_counts': {
                'class_0': int(np.sum(y_pred == 0)),
                'class_1': int(np.sum(y_pred == 1))
            }
        }
        return y_pred, y_proba, clf, debug_info
    
    return y_pred, y_proba, clf

def test_custom_threshold(y_proba, y_true, threshold):
    """
    Testa en anpassad threshold och returnera accuracy.
    
    Args:
        y_proba: Sannolikheter från predict_proba()[:, 1]
        y_true: Sanna etiketter 
        threshold: Tröskelvärde att testa
    
    Returns:
        dict: Accuracy och prediction counts
    """
    y_pred_custom = (y_proba >= threshold).astype(int)
    accuracy = np.mean(y_pred_custom == y_true)
    
    return {
        'threshold': threshold,
        'accuracy': float(accuracy),
        'pred_counts': {
            'class_0': int(np.sum(y_pred_custom == 0)),
            'class_1': int(np.sum(y_pred_custom == 1))
        },
        'predictions': y_pred_custom
    }
