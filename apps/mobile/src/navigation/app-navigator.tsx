import * as React from "react"
import { ActivityIndicator, View } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { DashboardScreen } from "../screens/dashboard-screen"
import { AccountsScreen } from "../screens/accounts-screen"
import { AccountFormScreen } from "../screens/account-form-screen"
import { LoginScreen } from "../screens/login-screen"
import { RegisterScreen } from "../screens/register-screen"
import { TermsScreen } from "../screens/terms-screen"
import { PrivacyScreen } from "../screens/privacy-screen"
import { TransactionsScreen } from "../screens/transactions-screen"
import { TransactionFormScreen } from "../screens/transaction-form-screen"
import { CategoriesScreen } from "../screens/categories-screen"
import { CategoryFormScreen } from "../screens/category-form-screen"
import { BudgetsScreen } from "../screens/budgets-screen"
import { BudgetFormScreen } from "../screens/budget-form-screen"
import { GoalsScreen } from "../screens/goals-screen"
import { GoalFormScreen } from "../screens/goal-form-screen"
import { ImportExportScreen } from "../screens/import-export-screen"
import { AdvancedReportsScreen } from "../screens/advanced-reports-screen"

export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Terms: undefined
  Privacy: undefined
  Dashboard: undefined
  Accounts: undefined
  AccountForm: {
    account?: {
      id: string
      name: string
      type: string
      currency: string
      balanceCents?: number
    }
  } | undefined
  AdvancedReports: undefined
  Transactions: undefined
  TransactionForm: {
    transaction?: {
      id: string
      type: "INCOME" | "EXPENSE" | "TRANSFER"
      occurredAt: string
      amountCents: number
      accountId: string
      categoryId: string | null
      transferAccountId: string | null
      description?: string
      tags?: string[]
      costCenter?: string | null
      notes?: string | null
      account?: { id: string; name: string; currency?: string }
      transferAccount?: { id: string; name: string; currency?: string }
      category?: { id: string; name: string }
    }
  } | undefined
  Categories: undefined
  CategoryForm: {
    category?: {
      id: string
      name: string
      type: "INCOME" | "EXPENSE"
      icon?: string
      color?: string
    }
  } | undefined
  Budgets: undefined
  BudgetForm: {
    budget?: {
      id: string
      categoryId?: string
      year: number
      month: number
      limitCents: number
      consumedCents?: number
      remainingCents?: number
      usedPercent?: number
      alertPercent: number
      alertReached?: boolean
      overLimit?: boolean
      category?: {
        id: string
        name: string
        type: "INCOME" | "EXPENSE"
        icon?: string
        color?: string
      }
    }
  } | undefined
  Goals: undefined
  GoalForm: {
    goal?: {
      id: string
      name: string
      targetCents: number
      currentCents: number
      targetDate: string
    }
  } | undefined
  ImportExport: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function CenteredLoader() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  )
}

export function AppNavigator() {
  const { initializing, user } = useAuth()

  if (initializing) return <CenteredLoader />

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: "Dashboard" }}
            />
            <Stack.Screen
              name="Accounts"
              component={AccountsScreen}
              options={{ title: "Contas" }}
            />
            <Stack.Screen
              name="AccountForm"
              component={AccountFormScreen}
              options={{ title: "Conta" }}
            />
            <Stack.Screen
              name="AdvancedReports"
              component={AdvancedReportsScreen}
              options={{ title: "Relatorios" }}
            />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{ title: "Transacoes" }}
            />
            <Stack.Screen
              name="TransactionForm"
              component={TransactionFormScreen}
              options={{ title: "Transacao" }}
            />
            <Stack.Screen
              name="Categories"
              component={CategoriesScreen}
              options={{ title: "Categorias" }}
            />
            <Stack.Screen
              name="CategoryForm"
              component={CategoryFormScreen}
              options={{ title: "Categoria" }}
            />
            <Stack.Screen
              name="Budgets"
              component={BudgetsScreen}
              options={{ title: "Orcamentos" }}
            />
            <Stack.Screen
              name="BudgetForm"
              component={BudgetFormScreen}
              options={{ title: "Orcamento" }}
            />
            <Stack.Screen
              name="Goals"
              component={GoalsScreen}
              options={{ title: "Metas" }}
            />
            <Stack.Screen
              name="GoalForm"
              component={GoalFormScreen}
              options={{ title: "Meta" }}
            />
            <Stack.Screen
              name="ImportExport"
              component={ImportExportScreen}
              options={{ title: "Import / Export" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: "Entrar" }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Criar conta" }}
            />
            <Stack.Screen
              name="Terms"
              component={TermsScreen}
              options={{ title: "Termos de Uso" }}
            />
            <Stack.Screen
              name="Privacy"
              component={PrivacyScreen}
              options={{ title: "Privacidade" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
