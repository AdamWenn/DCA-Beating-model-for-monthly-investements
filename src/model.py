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

class DynamicMLP(BaseEstimator, ClassifierMixin):
    """
    Skapar en MLPClassifier där dolda lagrets storlek sätts till 4x antalet features vid fit().
    """
    def __init__(self, alpha=0.001, random_state=None):
        self.alpha = alpha
        self.random_state = random_state
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
        return self.model_.predict(X)

    def predict_proba(self, X):
        # MLPClassifier ger proba via logistic/softmax i output
        return self.model_.predict_proba(X)

def make_baseline():
    return DummyClassifier(strategy="most_frequent")

def make_mlp_bagging():
    base = DynamicMLP(alpha=0.001)
    clf = BalancedBaggingClassifier(
        estimator=base,
        n_estimators=9,
        sampling_strategy="auto",
        bootstrap=True,
        n_jobs=-1
    )
    return clf

def fit_predict(clf, X_train, y_train, X_test):
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    try:
        y_proba = clf.predict_proba(X_test)[:, 1]
    except Exception:
        y_proba = np.zeros(len(y_pred))
    return y_pred, y_proba, clf
