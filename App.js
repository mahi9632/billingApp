import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const PRODUCTS = [
  { id: '1', name: 'Product A', price: 150 },
  { id: '2', name: 'Product B', price: 250 },
  { id: '3', name: 'Product C', price: 100 },
];

function HomeScreen({ navigation }) {
  const [cart, setCart] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const incrementQty = (product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return { ...prev, [product.id]: { product, quantity } };
    });
  };

  const decrementQty = (productId) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[productId];
        return newCart;
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const getTotal = () => {
    return Object.values(cart).reduce(
      (sum, entry) => sum + entry.product.price * entry.quantity,
      0
    );
  };

  const handleCheckout = async (paymentMethod) => {
    const now = new Date();
    const bill = {
      date: now.toISOString(),
      items: Object.values(cart),
      total: getTotal(),
      paymentMethod,
    };

    const existing = await AsyncStorage.getItem('bills');
    const bills = existing ? JSON.parse(existing) : [];
    bills.push(bill);
    await AsyncStorage.setItem('bills', JSON.stringify(bills));

    Alert.alert('Success', `Bill saved with ${paymentMethod} payment`);
    setCart({});
    setShowPaymentModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🛍️ Product List</Text>
      <FlatList
        data={PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cartItem = cart[item.id];
          return (
            <View style={styles.item}>
              <Text>{item.name} - ₹{item.price}</Text>
              {cartItem ? (
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => decrementQty(item.id)}>
                    <Text style={styles.qtyText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyLabel}>{cartItem.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => incrementQty(item)}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button title="Add" onPress={() => incrementQty(item)} />
              )}
            </View>
          );
        }}
      />

      <Text style={styles.heading}>🧾 Cart</Text>
      {Object.keys(cart).length === 0 ? (
        <Text>No items in cart.</Text>
      ) : (
        <FlatList
          data={Object.values(cart)}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Text style={styles.cartText}>
                {item.product.name} - ₹{item.product.price} x {item.quantity} = ₹
                {item.product.price * item.quantity}
              </Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => decrementQty(item.product.id)}>
                  <Text style={styles.qtyText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => incrementQty(item.product)}>
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.totalBox}>
        <Text style={styles.total}>Total: ₹{getTotal()}</Text>
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <Button
              title="Checkout"
              onPress={() => setShowPaymentModal(true)}
              disabled={Object.keys(cart).length === 0}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              title="View Bills"
              onPress={() => navigation.navigate('Bills')}
            />
          </View>
        </View>
      </View>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.heading}>Choose Payment Method</Text>
            <Button title="PhonePe" onPress={() => handleCheckout('PhonePe')} />
            <View style={{ margin: 10 }} />
            <Button title="Cash" onPress={() => handleCheckout('Cash')} />
            <View style={{ margin: 10 }} />
            <Button color="red" title="Cancel" onPress={() => setShowPaymentModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BillsScreen() {
  const [billsByDate, setBillsByDate] = useState({});

  const loadBills = async () => {
    const data = await AsyncStorage.getItem('bills');
    if (!data) {
      setBillsByDate({});
      return;
    }
    const bills = JSON.parse(data);

    const grouped = {};
    bills.forEach((bill) => {
      const date = new Date(bill.date).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(bill);
    });
    setBillsByDate(grouped);
  };

  useEffect(() => {
    loadBills();
  }, []);

  const clearBills = async () => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to clear all bill history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('bills');
            setBillsByDate({});
            Alert.alert('Success', 'All bill history cleared.');
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>📅 Daily Bills</Text>

      <View style={{ marginBottom: 20 }}>
        <Button title="Clear Bill History" color="red" onPress={clearBills} />
      </View>

      {Object.keys(billsByDate).length === 0 ? (
        <Text>No bills yet.</Text>
      ) : (
        Object.entries(billsByDate).map(([date, bills]) => (
          <View key={date} style={styles.billGroup}>
            <Text style={styles.dateHeading}>{date}</Text>
            {bills.map((bill, index) => (
              <View key={index} style={styles.billCard}>
                {bill.items.map((item, i) => (
                  <Text key={i}>
                    {item.product.name} x {item.quantity} = ₹
                    {item.product.price * item.quantity}
                  </Text>
                ))}
                <Text style={{ fontWeight: 'bold' }}>Total: ₹{bill.total}</Text>
                <Text>Payment: {bill.paymentMethod}</Text>
                <Text style={{ fontSize: 10 }}>
                  Time: {new Date(bill.date).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Billing App">
        <Stack.Screen name="Billing App" component={HomeScreen} />
        <Stack.Screen name="Bills" component={BillsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 5,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#e0f7fa',
    borderRadius: 5,
  },
  cartText: { flex: 1 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  qtyText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  qtyLabel: {
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  totalBox: { marginTop: 20 },
  total: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
  },
  billGroup: { marginBottom: 20 },
  dateHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  billCard: {
    padding: 10,
    backgroundColor: '#fce4ec',
    borderRadius: 8,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    width: '80%',
    borderRadius: 10,
    alignItems: 'center',
  },
});
