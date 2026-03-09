
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snoiymaflwumwlbschau.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2l5bWFmbHd1bXdsYnNjaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTIzMDIsImV4cCI6MjA4ODU4ODMwMn0.7zpSqaMEe1AnEAutW3qsno3ZfR68t4CLLE356iRvUr4'
const supabase = createClient(supabaseUrl, supabaseKey)

async function updatePayment() {
  // We look for the payment of 1.00 to update it to 35.00 (to get 23.00 profit)
  const { data: payments, error: findError } = await supabase
    .from('payments')
    .select('id, amount')
    .eq('amount', 1)
    .eq('status', 'approved')
    .limit(1)

  if (findError || !payments || payments.length === 0) {
    console.error('Could not find the R$ 1.00 payment:', findError || 'Not found')
    return
  }

  const paymentId = payments[0].id
  console.log(`Found payment ${paymentId}, updating to 35.00`)

  const { error: updateError } = await supabase
    .from('payments')
    .update({ amount: 35.00 })
    .eq('id', paymentId)

  if (updateError) {
    console.error('Error updating payment:', updateError)
    return
  }

  console.log('Payment updated successfully!')
}

updatePayment()
