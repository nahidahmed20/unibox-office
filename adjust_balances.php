<?php
$adjustments = [
    10 => ['target' => 212600, 'name' => 'City Bank'],
    4  => ['target' => 57000, 'name' => 'Elephant Road Branch'],
    5  => ['target' => 54200, 'name' => 'Cash'],
];

foreach ($adjustments as $id => $data) {
    $account = App\Models\Account::find($id);
    $diff = $account->current_balance - $data['target'];

    if ($diff != 0) {
        $type = $diff > 0 ? 'debit' : 'credit';
        $amount = abs($diff);

        $account->current_balance = $data['target'];
        $account->save();

        App\Models\Transaction::create([
            'account_id' => $id,
            'type' => $type,
            'amount' => $amount,
            'transaction_date' => date('Y-m-d'),
            'description' => 'Accounts Equal Balance',
            'transactionable_type' => null,
            'transactionable_id' => null,
        ]);
        echo "Adjusted {$data['name']} by {$amount} ({$type}). New balance: {$data['target']}\n";
    } else {
        echo "{$data['name']} is already at {$data['target']}\n";
    }
}
